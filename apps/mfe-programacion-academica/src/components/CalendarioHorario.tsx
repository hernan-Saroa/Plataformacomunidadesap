import { validarDias, crearDias, editarSesion, borrarSesion, ErrorHorario, type ValidacionDias } from '../services/api/horarioQaApi';
import { ModalConfirmacion } from './ModalConfirmacion';
import { CampoHora24, hora24Valida } from './CampoHora24';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useBorradorGrupo } from './PanelGrupos';
import { createPortal } from 'react-dom';
import { CalendarDays, Clock, Loader2, MapPin, Monitor, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import type { CalendarioDocente } from '../services/api/vistaApi';

import {
  getSesiones, definirPeriodoGrupo, getGrupo, getAulas, getHorasGrupo, actualizarOfertaCetapGrupo,
  esSinAula, etiquetaModalidad,
  type Sesion, type TipoSesion, type Aula, type HorasGrupo, type Grupo,
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
  { valor: 'LUNES', corto: 'Lun', largo: 'Lunes' },
  { valor: 'MARTES', corto: 'Mar', largo: 'Martes' },
  { valor: 'MIERCOLES', corto: 'Mié', largo: 'Miércoles' },
  { valor: 'JUEVES', corto: 'Jue', largo: 'Jueves' },
  { valor: 'VIERNES', corto: 'Vie', largo: 'Viernes' },
  { valor: 'SABADO', corto: 'Sáb', largo: 'Sábado' },
  { valor: 'DOMINGO', corto: 'Dom', largo: 'Domingo' },
] as const;

/** Ventana visible del día. Las sesiones se ubican por minutos dentro de ella. */
const HORA_DESDE = 6;
const HORA_HASTA = 22;
// §3.2 — Alto de hora algo menor: 16h × 40px = 640px, más manejable dentro del
// modal (que ahora hace scroll vertical). El arrastre usa esta constante, así que
// el gesto sigue calzando con la rejilla al cambiarla.
const ALTO_HORA = 40; // px

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
  /** Compatibilidad con padres existentes. El ciclo se lee por idGrupo;
   * estas props pueden estar obsoletas y no son la fuente de los campos. */
  fechaInicioGrupo?: string | null;
  fechaFinGrupo?: string | null;
  onOfertaActualizada?: (grupo: Grupo) => void;
  /** Virtual (063) o a distancia (065): sesiones solo mediadas por tecnología y horario opcional. */
  modalidad?: 'presencial' | 'virtual' | 'distancia';
}

/** El modo de consulta no monta los efectos ni los controles de escritura del grupo. */
export function CalendarioHorario(props: Props | { soloLectura: true; calendario: CalendarioDocente }) {
  return 'soloLectura' in props
    ? <CalendarioConsulta calendario={props.calendario} />
    : <CalendarioGrupoEditable {...props} />;
}

function CalendarioConsulta({ calendario: c }: { calendario: CalendarioDocente }) {
  const [expandido, setExpandido] = useState(true);
  const contenidoId = useId();
  // Incluye horarios fuera de la ventana habitual y conserva visibles los solapamientos.
  const desde = Math.min(HORA_DESDE, ...c.franjas.map(f => Math.floor(aMinutos(f.horaInicio) / 60)));
  const hasta = Math.max(HORA_HASTA, ...c.franjas.map(f => Math.ceil(aMinutos(f.horaFin) / 60)));
  return <section aria-label="Calendario semanal docente" className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-[#003DA5]">Calendario semanal · {c.docente.nombre ?? 'Docente'} · {c.periodo.codigo}</h3>
      <button type="button" aria-expanded={expandido} aria-controls={contenidoId} onClick={() => setExpandido(e => !e)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-[#003DA5]">{expandido ? '▲ Ocultar horario' : '▼ Ver horario'}</button></div>
    <p>{c.docente.vinculacion?.texto ?? 'Vinculación no disponible'} · Horas: {c.horas.total === null ? 'No disponibles' : c.horas.total} · Tope: {c.horas.tope ?? 'No aplica'}</p>
    <div id={contenidoId} hidden={!expandido}>
    {c.horas.total !== null && c.horas.tope !== null && c.horas.total > c.horas.tope && <p className="text-red-700">Las horas superan el tope del docente.</p>}
    {!c.franjas.length && <p>No hay franjas en este periodo.</p>}
    <div className="overflow-x-auto"><div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, minmax(130px, 1fr))', minWidth: 966 }}>
      <div />{DIAS.map(d => <h4 key={d.valor} className="text-center font-semibold p-2">{d.corto}</h4>)}
      <div style={{ position: 'relative', height: (hasta - desde) * ALTO_HORA }}>{Array.from({ length: hasta - desde }, (_, i) => <span key={i} style={{ position: 'absolute', top: i * ALTO_HORA }} className="text-xs text-slate-500">{String(desde + i).padStart(2, '0')}:00</span>)}</div>
      {DIAS.map(d => {
        const franjas = c.franjas.filter(f => f.diaSemana === d.valor).sort((a,b) => a.horaInicio.localeCompare(b.horaInicio) || a.horaFin.localeCompare(b.horaFin));
        const finales: number[] = [];
        const columnas = franjas.map(f => {
          let columna = finales.findIndex(fin => fin <= aMinutos(f.horaInicio));
          if (columna < 0) columna = finales.length;
          finales[columna] = aMinutos(f.horaFin);
          return columna;
        });
        return <div key={d.valor} className="border-l border-slate-200" style={{ position: 'relative', height: (hasta - desde) * ALTO_HORA }}>
          {Array.from({ length: hasta - desde }, (_, i) => <div key={i} className="border-t border-slate-100" style={{ position: 'absolute', top: i * ALTO_HORA, width: '100%' }} />)}
          {franjas.map((f, i) => {
            const columna = columnas[i];
            const texto = f.reservada ? 'Ocupado' : `${f.asignatura ?? 'Asignatura'} · Grupo ${f.numeroGrupo ?? '—'} · ${f.programa ?? ''} · ${f.aulaCodigo ? `Aula ${f.aulaCodigo}` : 'Sin aula'} · ${f.estado ?? ''} · Ciclo ${f.cicloInicio ?? 'sin definir'} a ${f.cicloFin ?? 'sin definir'}`;
            return <div key={f.idFranja} tabIndex={0} title={`${f.horaInicio}–${f.horaFin} · ${texto}`} className="rounded border border-blue-200 p-1 text-xs overflow-auto focus:ring-2 focus:ring-blue-600" style={{ position: 'absolute', top: (aMinutos(f.horaInicio) / 60 - desde) * ALTO_HORA, height: Math.max((aMinutos(f.horaFin) - aMinutos(f.horaInicio)) / 60 * ALTO_HORA, 20), left: `${columna / finales.length * 100}%`, width: `${100 / finales.length}%`, background: f.reservada ? '#e2e8f0' : '#eff6ff', color: '#1e3a8a', zIndex: i + 1 }}>
              <strong>{f.horaInicio}–{f.horaFin}</strong><p>{texto}</p>
            </div>;
          })}
        </div>;
      })}
    </div></div>
    <p className="text-xs text-slate-500">Solo lectura. Las franjas reservadas se muestran como ocupadas, sin detalles.</p>
    </div>
  </section>;
}

function CalendarioGrupoEditable({
  idGrupo, numeroGrupo, nombreAsignatura, onOfertaActualizada, modalidad = 'presencial',
}: Props) {
  const virtual = esSinAula(modalidad);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const horaDesde = Math.min(HORA_DESDE, ...sesiones.map(s => Math.floor(aMinutos(s.horaInicio) / 60)));
  const horaHasta = Math.max(HORA_HASTA, ...sesiones.map(s => Math.ceil(aMinutos(s.horaFin) / 60)));
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [cicloCargado, setCicloCargado] = useState<string | null>(null);
  const [cicloPersistido, setCicloPersistido] = useState('');
  const [guardandoCiclo, setGuardandoCiclo] = useState(false);
  const revisionGrupo = useRevisionProgramacion(`grupo:${idGrupo}`);
  const revisionHorario = useRevisionProgramacion('horarios');
  const revisionAulas = useRevisionProgramacion('aulas');
  const [avisoPeriodo, setAvisoPeriodo] = useState('');
  const [ofertaGrupo, setOfertaGrupo] = useState<string | null>(null);
  const [errorAulas, setErrorAulas] = useState('');

  // EFDS-2310: leer siempre el grupo persistido, también al reabrir con props antiguas.
  useEffect(() => {
    let vigente = true;
    setCicloCargado(null);
    setFechaInicio(''); setFechaFin('');
    getGrupo(idGrupo).then((grupo) => {
      if (!vigente) return;
      setFechaInicio(grupo.fechaInicio?.slice(0, 10) ?? '');
      setFechaFin(grupo.fechaFin?.slice(0, 10) ?? '');
      setCicloPersistido(`${grupo.fechaInicio?.slice(0, 10) ?? ''}|${grupo.fechaFin?.slice(0, 10) ?? ''}`);
      setCicloCargado(idGrupo);
      setOfertaGrupo(grupo.idOfertaCetap);
    }).catch((e) => {
      if (vigente) setAvisoPeriodo(e?.message || 'No se pudo consultar el ciclo guardado.');
    });
    return () => { vigente = false; };
  }, [idGrupo, revisionGrupo]);

  /**
   * Arrastre para crear una franja (3.3). La rejilla es propia y la conversión
   * tiempo↔píxeles ya existía en ambos sentidos, así que el arrastre solo añade
   * los tres manejadores y una vista previa. Un clic simple sigue funcionando:
   * si el rango sale menor a 15 min, se propone una hora como antes.
   */
  const [arrastre, setArrastre] = useState<{ dia: string; desde: number; hasta: number } | null>(null);

  // Formulario que se abre al hacer clic en el calendario (o arrastrando).
  const [nueva, setNueva] = useState<null | {
    idFranja?: string; dias?: string[]; diaSemana: string; horaInicio: string; horaFin: string; tipoSesion: TipoSesion; aulaCodigo: string;
  }>(null);
  useBorradorGrupo(!!nueva || (cicloCargado === idGrupo && `${fechaInicio}|${fechaFin}` !== cicloPersistido), guardando || guardandoCiclo);
  const [validacion, setValidacion] = useState<{ clave: string; resultado: ValidacionDias } | null>(null);
  const [devolucion, setDevolucion] = useState<{ tipo: 'editar' | 'eliminar'; mensaje: string; efecto: string; sesion?: Sesion } | null>(null);
  const efectoDevolver = (code?: string) => code === 'FRANJA_TOMADA' ? 'La sesión quedará sin docente. Será necesario volver a asignarla.' : 'La concertación pasará a Devuelta con un comentario automático. Será necesario revisar y completar de nuevo su aprobación.';
  const [descartarSesion, setDescartarSesion] = useState(false);
  const originalSesion = useRef('');
  const cerrarSesion = () => {
    if (guardando) return;
    if (nueva && JSON.stringify(nueva) !== originalSesion.current) setDescartarSesion(true);
    else setNueva(null);
  };
  const [sesionEliminar, setSesionEliminar] = useState<Sesion | null>(null);
  const validacionActual = nueva && validacion?.clave === JSON.stringify(nueva) ? validacion.resultado : null;
  const edicionBloqueada = !!nueva?.idFranja && sesiones.find(s => s.idFranja === nueva.idFranja)?.estado === 'APROBADA';
  const abrirEdicion = (s: Sesion) => { setError(''); const datos = { idFranja: s.idFranja, diaSemana: s.diaSemana, horaInicio: hhmm(s.horaInicio), horaFin: hhmm(s.horaFin), tipoSesion: s.tipoSesion, aulaCodigo: s.aulaCodigo ?? '' }; originalSesion.current = JSON.stringify(datos); setNueva(datos); };
  // Lista CERRADA de salones (3.4): no se puede escribir uno que no exista.
  const [aulas, setAulas] = useState<Aula[]>([]);
  useEffect(() => {
    let vigente = true;
    setErrorAulas('');
    getAulas({ grupo: idGrupo }).then((datos) => { if (vigente) setAulas(datos); })
      .catch((e) => { if (vigente) { setAulas([]); setErrorAulas(e?.message || 'No se pudieron consultar las aulas válidas para este grupo.'); } });
    return () => { vigente = false; };
  }, [idGrupo, revisionAulas, revisionGrupo]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const abierta = !!nueva;
  useEffect(() => {
    if (!abierta) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || document.querySelector('[role="alertdialog"]')) return;
      const campos = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])') ?? [])];
      if (e.shiftKey && document.activeElement === campos[0]) { e.preventDefault(); campos.at(-1)?.focus(); }
      else if (!e.shiftKey && (document.activeElement === campos.at(-1) || document.activeElement === panelRef.current)) { e.preventDefault(); campos[0]?.focus(); }
    };
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('keydown', tecla); previo?.focus(); };
  }, [abierta]);

  // §1.3 — Horas programadas vs requeridas por el catálogo, en vivo.
  const [resumenHoras, setResumenHoras] = useState<HorasGrupo | null>(null);
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    getSesiones(idGrupo)
      .then((datos) => { if (vigente) setSesiones(datos); })
      .catch((e) => { if (vigente) setError(e?.message || 'No se pudieron cargar las sesiones.'); })
      .finally(() => { if (vigente) setCargando(false); });
    getHorasGrupo(idGrupo)
      .then((datos) => { if (vigente) setResumenHoras(datos); })
      .catch(() => { if (vigente) setResumenHoras(null); });
    return () => { vigente = false; };
  }, [idGrupo, revisionHorario]);

  /**
   * Minuto del día que corresponde a una posición vertical dentro de la columna.
   * Se redondea a 15 min para que el gesto sea cómodo; el campo admite cualquier
   * hora en múltiplos de 5, que es la granularidad real.
   */
  const minutoEn = (clientY: number, caja: DOMRect) => {
    const desdeArriba = ((clientY - caja.top) / ALTO_HORA) * 60;
    const total = horaDesde * 60 + Math.round(desdeArriba / 15) * 15;
    return Math.min(Math.max(total, horaDesde * 60), horaHasta * 60);
  };

  const fmtHora = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  /** Abre el formulario con un rango ya definido (clic o arrastre). */
  const abrirRango = (dia: string, desdeMin: number, hastaMin: number) => {
    const ini = Math.min(desdeMin, hastaMin);
    const fin = Math.max(desdeMin, hastaMin);
    const datos = {
      diaSemana: dia, dias: [dia],
      horaInicio: fmtHora(Math.min(ini, horaHasta * 60 - 60)),
      horaFin: fmtHora(Math.min(Math.max(fin, ini + 60), horaHasta * 60)),
      tipoSesion: (virtual ? 'mediada_tecnologia' : 'presencial') as TipoSesion,
      aulaCodigo: '',
    };
    originalSesion.current = JSON.stringify(datos); setNueva(datos);
    setError('');
  };

  const guardar = async (confirmarDevolucion = false) => {
    if (!nueva || guardando || edicionBloqueada) return;
    if (!hora24Valida(nueva.horaInicio) || !hora24Valida(nueva.horaFin) || nueva.horaFin <= nueva.horaInicio) { setError('Indica inicio y fin válidos en formato de 24 h; el fin debe ser posterior al inicio.'); return; }
    setGuardando(true);
    setError('');
    let ofertaGuardada = false;
    try {
      const datos = { idGrupo, dias: nueva.dias ?? [nueva.diaSemana], horaInicio: nueva.horaInicio, horaFin: nueva.horaFin, tipoSesion: nueva.tipoSesion, aulaCodigo: nueva.tipoSesion === 'presencial' ? (nueva.aulaCodigo || null) : null };
      if (!nueva.idFranja) {
        if (!datos.dias.length) { setError('Selecciona al menos un día.'); return; }
        if (!validacionActual?.valido) {
          setValidacion({ clave: JSON.stringify(nueva), resultado: await validarDias(datos) });
          return;
        }
      }
      const aulaElegida = nueva.tipoSesion === 'presencial' ? aulas.find((a) => a.codigo === nueva.aulaCodigo) : null;
      if (aulaElegida && !ofertaGrupo) {
        if (!aulaElegida.idOfertaCetap) throw new Error('No se pudo identificar la oferta CETAP de esta aula. Elige otra aula o asigna la oferta directamente.');
        const actualizado = await actualizarOfertaCetapGrupo(idGrupo, aulaElegida.idOfertaCetap);
        setOfertaGrupo(actualizado.idOfertaCetap);
        onOfertaActualizada?.(actualizado);
        ofertaGuardada = true;
      }
      if (nueva.idFranja) {
        const antes = JSON.parse(originalSesion.current);
        const campos = { diaSemana: nueva.diaSemana, horaInicio: datos.horaInicio, horaFin: datos.horaFin, tipoSesion: datos.tipoSesion, aulaCodigo: datos.aulaCodigo };
        const cambios = Object.fromEntries(Object.entries(campos).filter(([k,v]) => (antes[k] || null) !== (v || null))) as Partial<typeof campos>;
        if (!Object.keys(cambios).length) { setNueva(null); return; }
        const r = await editarSesion(nueva.idFranja, idGrupo, { ...cambios, confirmarDevolucion });
        setResumenHoras(r.horas);
      } else {
        const r = await crearDias(datos);
        setResumenHoras(r.horas);
      }
      setNueva(null); setDevolucion(null);
    } catch (e: any) {
      if (e instanceof ErrorHorario && ['FRANJA_TOMADA', 'EN_CONCERTACION'].includes(e.code ?? '')) setDevolucion({ tipo: 'editar', mensaje: e.message, efecto: efectoDevolver(e.code) });
      if (e instanceof ErrorHorario && Array.isArray(e.datos?.dias)) setValidacion({ clave: JSON.stringify(nueva), resultado: e.datos });
      // El cruce intra-grupo llega como mensaje del backend: se muestra tal cual
      // para que el programador sepa contra qué sesión choca.
      setError(`${e?.message || 'No se pudo crear la sesión.'}${ofertaGuardada ? ' La oferta CETAP sí quedó asignada al grupo.' : ''}`);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (s: Sesion, confirmarDevolucion = false) => {
    if (guardando) return;
    if (s.estado === 'APROBADA') { setError('La sesión está aprobada. Debe reabrirse antes de modificarla o eliminarla.'); return; }
    setError(''); setGuardando(true);
    try {
      const r = await borrarSesion(s.idFranja, idGrupo, confirmarDevolucion);
      setResumenHoras(r.horas); setSesionEliminar(null); setDevolucion(null);
      if (nueva?.idFranja === s.idFranja) setNueva(null);
    } catch (e: any) {
      setSesionEliminar(null);
      if (e instanceof ErrorHorario && ['FRANJA_TOMADA', 'EN_CONCERTACION'].includes(e.code ?? '')) setDevolucion({ tipo: 'eliminar', mensaje: e.message, efecto: efectoDevolver(e.code), sesion: s });
      setError(e?.message || 'No se pudo eliminar la sesión.');
    } finally { setGuardando(false); }
  };

  const guardarPeriodo = async () => {
    if (cicloCargado !== idGrupo || guardandoCiclo) return;
    setGuardandoCiclo(true);
    setAvisoPeriodo('');
    try {
      await definirPeriodoGrupo(idGrupo, {
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
      });
      setAvisoPeriodo('Periodo guardado.');
    } catch (e: any) {
      setAvisoPeriodo(e?.message || 'No se pudo guardar el periodo.');
    } finally {
      setGuardandoCiclo(false);
    }
  };

  const porDia = useMemo(() => {
    const mapa: Record<string, Sesion[]> = {};
    DIAS.forEach((d) => { mapa[d.valor] = []; });
    sesiones.forEach((s) => { if (mapa[s.diaSemana]) mapa[s.diaSemana].push(s); });
    return mapa;
  }, [sesiones]);

  const horas = useMemo(
    () => Array.from({ length: horaHasta - horaDesde }, (_, i) => horaDesde + i),
    [horaDesde, horaHasta],
  );
  const altoTotal = (horaHasta - horaDesde) * ALTO_HORA;

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
        <div className="flex flex-col items-end gap-1">
          {/* §1.3 — Horas programadas vs requeridas por el plan, en vivo. */}
          {resumenHoras && resumenHoras.requeridas != null && (
            resumenHoras.programadas == null ? (
              <span className="text-[11px] text-slate-400">Define el ciclo para ver las horas · plan {resumenHoras.requeridas}h</span>
            ) : (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${resumenHoras.excede ? 'bg-red-50 text-red-700' : resumenHoras.programadas > resumenHoras.requeridas ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {resumenHoras.programadas}h programadas / {resumenHoras.requeridas}h del plan
                {resumenHoras.excede && ' · excede el tope'}
              </span>
            )
          )}
          <button type="button" onClick={() => abrirRango('LUNES', 7 * 60, 9 * 60)}
            className="flex items-center gap-1 rounded-lg bg-[#003DA5] px-3 py-1.5 text-xs font-bold text-white">
            <Plus className="w-3.5 h-3.5" /> Agregar sesión
          </button>
          <p className="text-xs text-slate-400 font-medium">
            O haga clic (o arrastre) en el calendario.
          </p>
        </div>
      </div>

      {virtual && (
        <p role="note" className="mx-4 mt-3 text-xs text-violet-800 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
          Grupo {etiquetaModalidad(modalidad).toLowerCase()}: sus sesiones son mediadas por tecnología y sin aula. El horario es opcional: si no lo define,
          el docente asignado lo define en «Mi programación». El ciclo de clases sí se necesita para calcular las horas.
        </p>
      )}

      {/* Periodo del ciclo de clases, propio de este grupo */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inicio del ciclo</span>
          <input type="date" disabled={cicloCargado !== idGrupo || guardandoCiclo} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fin del ciclo</span>
          <input type="date" disabled={cicloCargado !== idGrupo || guardandoCiclo} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
        </label>
        <button onClick={guardarPeriodo} disabled={cicloCargado !== idGrupo || guardandoCiclo}
          className="px-4 py-2 rounded-lg text-white text-xs font-bold active:scale-95 transition-all"
          style={{ background: '#003DA5' }}>
          Guardar periodo
        </button>
        {avisoPeriodo && <span className="text-xs font-medium text-slate-500">{avisoPeriodo}</span>}
      </div>

      {error && !nueva && (
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
          <div className="min-w-[640px]">
            <div className="grid sticky top-0 z-10 bg-white" style={{ gridTemplateColumns: '48px repeat(7, minmax(80px, 1fr))' }}>
              <div />
              {DIAS.map((d) => (
                <div key={d.valor} className="pb-2 text-center text-xs font-black text-slate-600 uppercase tracking-wider">
                  {d.corto}
                </div>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, minmax(80px, 1fr))' }}>
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
                  // Puntero (ratón, lápiz o dedo). Con el dedo un toque abre el modal con una hora;
                  // el arrastre queda para ratón/lápiz, así el gesto táctil sigue desplazando la página.
                  onPointerDown={(e) => {
                    if ((e.button ?? 0) !== 0) return; // solo botón principal
                    const m = minutoEn(e.clientY, e.currentTarget.getBoundingClientRect());
                    setArrastre({ dia: d.valor, desde: m, hasta: m });
                  }}
                  onPointerMove={(e) => {
                    if (e.pointerType === 'touch' || !arrastre || arrastre.dia !== d.valor) return;
                    const m = minutoEn(e.clientY, e.currentTarget.getBoundingClientRect());
                    if (m !== arrastre.hasta) setArrastre({ ...arrastre, hasta: m });
                  }}
                  onPointerUp={() => {
                    if (!arrastre || arrastre.dia !== d.valor) return;
                    abrirRango(d.valor, arrastre.desde, arrastre.hasta);
                    setArrastre(null);
                  }}
                  onPointerLeave={(e) => { if (e.pointerType !== 'touch' && arrastre?.dia === d.valor) setArrastre(null); }}
                  className="relative select-none border-l border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors"
                  style={{ height: altoTotal }}
                  title={`Clic o arrastre para agregar una sesión el ${d.corto.toLowerCase()}`}
                >
                  {/* Vista previa del arrastre: el rango que quedará al soltar. */}
                  {arrastre && arrastre.dia === d.valor && Math.abs(arrastre.hasta - arrastre.desde) >= 15 && (
                    <div
                      className="pointer-events-none absolute left-1 right-1 rounded-md border-2 border-dashed border-[#003DA5] bg-blue-100/50"
                      style={{
                        top: ((Math.min(arrastre.desde, arrastre.hasta) - horaDesde * 60) / 60) * ALTO_HORA,
                        height: Math.max((Math.abs(arrastre.hasta - arrastre.desde) / 60) * ALTO_HORA, 8),
                      }}
                    >
                      <span className="px-1 text-[0.6rem] font-bold text-[#003DA5]">
                        {fmtHora(Math.min(arrastre.desde, arrastre.hasta))}–{fmtHora(Math.max(arrastre.desde, arrastre.hasta))}
                      </span>
                    </div>
                  )}
                  {horas.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: i * ALTO_HORA }} />
                  ))}

                  {porDia[d.valor].map((s) => {
                    const ini = aMinutos(s.horaInicio) - horaDesde * 60;
                    const dur = aMinutos(s.horaFin) - aMinutos(s.horaInicio);
                    const c = COLOR_TIPO[s.tipoSesion] || COLOR_TIPO.presencial;
                    return (
                      <div
                        key={s.idFranja}
                        onClick={(e) => { e.stopPropagation(); abrirEdicion(s); }}
                        role="button" tabIndex={0}
                        onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrirEdicion(s); } }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        title={`${hhmm(s.horaInicio)}–${hhmm(s.horaFin)} · ${s.tipoSesion === 'presencial' ? 'Presencial' : 'Mediada por tecnología'}${s.aulaCodigo ? ` · ${s.aulaCodigo}` : ''}`}
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
                        <button type="button" onClick={e => { e.stopPropagation(); abrirEdicion(s); }} aria-label={`Editar sesión ${hhmm(s.horaInicio)}–${hhmm(s.horaFin)}`} className="absolute top-0.5 right-6 rounded bg-white/90 p-0.5 text-blue-700"><Pencil className="h-3 w-3" /></button>
                        <button type="button"
                          disabled={s.estado === 'APROBADA'}
                          onClick={(e) => { e.stopPropagation(); setSesionEliminar(s); }}
                          title="Eliminar sesión"
                          aria-label={`Eliminar sesión ${hhmm(s.horaInicio)}–${hhmm(s.horaFin)}`}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded bg-white/80 text-slate-400 hover:text-red-600 transition-opacity"
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

      {/* Nueva sesión: MODAL centrado (nov-2026). Antes era un formulario al pie del calendario
          que en pantallas pequeñas quedaba fuera de vista. Clic o arrastre en la rejilla lo abren
          con el día y las horas ya puestos; aquí se confirman la modalidad de la sesión y el aula. */}
      {/* Portal al body: dentro del modal de grupos un ancestro con transform deformaba el position:fixed. */}
      {nueva && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.45)', padding: 16 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) cerrarSesion(); }}>
          <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`nueva-sesion-${idGrupo}`}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrarSesion(); } }}
            style={{ width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,.35)' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <h4 id={`nueva-sesion-${idGrupo}`} className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#003DA5]" /> {nueva.idFranja ? 'Editar sesión' : 'Nueva sesión'} – Grupo {numeroGrupo}
              </h4>
              <button type="button" aria-label="Cerrar" disabled={guardando} onClick={cerrarSesion} className="p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {edicionBloqueada && <p role="note" className="m-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">La sesión está aprobada. Debe reabrirse antes de modificarla o eliminarla.</p>}
            <fieldset disabled={guardando || edicionBloqueada} className="min-w-0 px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {nueva.idFranja ? <label className="flex flex-col gap-1.5">Día<select value={nueva.diaSemana} onChange={e => setNueva({ ...nueva, diaSemana: e.target.value })}>{DIAS.map(d => <option key={d.valor} value={d.valor}>{d.largo}</option>)}</select></label> : <fieldset style={{ gridColumn: '1 / -1' }}><legend className="text-xs font-bold">Días</legend><div className="flex flex-wrap gap-2 mt-2">{DIAS.map((d,i) => <button key={d.valor} type="button" aria-label={d.largo} aria-pressed={(nueva.dias ?? []).includes(d.valor)} onClick={() => setNueva({ ...nueva, dias: (nueva.dias ?? []).includes(d.valor) ? nueva.dias?.filter(v => v !== d.valor) : [...(nueva.dias ?? []), d.valor] })} className={`rounded-lg border px-3 py-2 font-bold ${(nueva.dias ?? []).includes(d.valor) ? 'bg-blue-100 border-blue-500 text-blue-900' : ''}`}>{['L','M','X','J','V','S','D'][i]}</button>)}<button type="button" onClick={() => setNueva({ ...nueva, dias: DIAS.map(d => d.valor) })} className="rounded-lg border px-3 py-2">Todos</button></div></fieldset>}
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.62rem] font-bold text-slate-500 uppercase">Inicio</span>
                <CampoHora24 aria-label="Inicio" value={nueva.horaInicio}
                  onChange={(horaInicio) => setNueva({ ...nueva, horaInicio })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.62rem] font-bold text-slate-500 uppercase">Fin</span>
                <CampoHora24 aria-label="Fin" value={nueva.horaFin}
                  onChange={(horaFin) => setNueva({ ...nueva, horaFin })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
              </label>

              <fieldset className="flex flex-col gap-1.5" style={{ gridColumn: "1 / -1" }}>
                <legend className="text-[0.62rem] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1.5">
                  <Monitor className="w-3 h-3" /> Modalidad de la sesión
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['presencial', 'mediada_tecnologia'] as TipoSesion[]).map((t) => (
                    <label key={t} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${nueva.tipoSesion === t ? 'border-[#003DA5] bg-blue-50 text-[#003DA5] font-bold' : 'border-slate-200 text-slate-600'} ${virtual && t === 'presencial' ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      <input type="radio" name={`tipo-${idGrupo}`} value={t} checked={nueva.tipoSesion === t}
                        disabled={virtual && t === 'presencial'}
                        onChange={() => setNueva({ ...nueva, tipoSesion: t, aulaCodigo: t === 'presencial' ? nueva.aulaCodigo : '' })} />
                      {t === 'presencial' ? 'Presencial' : 'Mediada por tecnología'}
                    </label>
                  ))}
                </div>
                {virtual && <span className="text-xs text-violet-700">Grupo {etiquetaModalidad(modalidad).toLowerCase()}: solo sesiones mediadas por tecnología, sin aula.</span>}
              </fieldset>

              {/* 3.4 — El salón SOLO aplica a sesiones presenciales y sale de la lista cerrada de aulas. */}
              <label className="flex flex-col gap-1.5" style={{ gridColumn: "1 / -1" }}>
                <span className="text-[0.62rem] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Aula
                </span>
                <select
                  value={nueva.tipoSesion === 'presencial' ? nueva.aulaCodigo : ''}
                  disabled={nueva.tipoSesion !== 'presencial' || !!errorAulas}
                  onChange={(e) => setNueva({ ...nueva, aulaCodigo: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400">
                  <option value="">
                    {nueva.tipoSesion === 'presencial' ? 'Sin asignar' : 'No aplica (mediada por tecnología)'}
                  </option>
                  {nueva.tipoSesion === 'presencial' && aulas.map((a) => (
                    <option key={a.codigo} value={a.codigo}>{a.nombre} · {a.cetap?.nombre || a.cetap?.codigo || 'Sin CETAP'}</option>
                  ))}
                </select>
                {errorAulas && <span role="alert" className="text-xs text-amber-800">{errorAulas}</span>}
                {nueva.tipoSesion === 'presencial' && aulas.length === 0 && !errorAulas && <span className="text-xs text-amber-800">No hay aulas registradas en el CETAP de la oferta de este grupo. Puedes dejar el aula sin asignar o cambiar la oferta del grupo.</span>}
                {nueva.tipoSesion === 'presencial' && !ofertaGrupo && nueva.aulaCodigo && <span className="text-xs text-blue-800">Al guardar, la oferta CETAP de esta aula se asignará automáticamente al grupo.</span>}
              </label>
            </fieldset>

            {validacionActual && <div role="status" className="mx-5 mb-3 rounded-lg border p-3 text-sm"><p className="font-bold">Validación por día</p><ul>{validacionActual.dias.map(d => <li key={d.diaSemana}>{DIAS.find(v => v.valor === d.diaSemana)?.largo}: {d.ok ? 'Sin conflictos' : d.conflictos.map(c => c.mensaje).join('; ')}</li>)}</ul><p>Después de guardar: {validacionActual.horas.programadasDespues} h / {validacionActual.horas.requeridas} h del plan{validacionActual.horas.excede ? ' · Excede las horas del plan' : ''}</p></div>}
            {nueva.idFranja && <button type="button" onClick={() => setSesionEliminar(sesiones.find(s => s.idFranja === nueva.idFranja) ?? null)} disabled={guardando || edicionBloqueada} className="mx-5 mb-3 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">Eliminar sesión</button>}
            {error && (
              <div role="alert" className="mx-5 mb-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">{error}</div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-5 pb-3">
              <button type="button" onClick={cerrarSesion} disabled={guardando}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white">
                Cancelar
              </button>
              <button type="button" onClick={() => guardar()} disabled={guardando || edicionBloqueada}
                className="px-4 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
                style={{ background: guardando ? '#9CA3AF' : '#003DA5' }}>
                {guardando ? 'Guardando…' : nueva.idFranja ? 'Guardar cambios' : validacionActual?.valido ? 'Agregar sesiones' : 'Validar días'}
              </button>
            </div>
            <p className="px-5 pb-4 text-[0.68rem] text-slate-400">La hora es libre, en múltiplos de 5 minutos. El tipo de sesión es independiente de la modalidad de la asignatura.</p>
          </div>
        </div>,
        document.body,
      )}
      {sesionEliminar && <ModalConfirmacion titulo="Eliminar sesión" advertencia="Esta acción no se puede deshacer." ocupado={guardando} onCancelar={() => setSesionEliminar(null)} onConfirmar={() => borrar(sesionEliminar)}><p>¿Desea eliminar la sesión del {DIAS.find(d => d.valor === sesionEliminar.diaSemana)?.largo.toLowerCase()} {hhmm(sesionEliminar.horaInicio)}–{hhmm(sesionEliminar.horaFin)}?</p></ModalConfirmacion>}
      {devolucion && <ModalConfirmacion titulo="Confirmar cambio de una sesión asignada" advertencia={devolucion.efecto} ocupado={guardando} onCancelar={() => setDevolucion(null)} onConfirmar={() => devolucion.tipo === 'editar' ? guardar(true) : borrar(devolucion.sesion!, true)}><p>{devolucion.mensaje}</p></ModalConfirmacion>}
      {descartarSesion && <ModalConfirmacion titulo="¿Descartar los cambios de la sesión?" advertencia="Los datos de la sesión que no hayas guardado se perderán." onCancelar={() => setDescartarSesion(false)} onConfirmar={() => { setNueva(null); setDescartarSesion(false); }}><p>Puedes cancelar para continuar editando.</p></ModalConfirmacion>}
    </div>
  );
}
