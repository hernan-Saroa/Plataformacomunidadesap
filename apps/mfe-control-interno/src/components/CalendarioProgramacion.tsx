/**
 * Campo de fecha con calendario de la vigencia (EFDS-2132).
 *
 * Reemplaza al selector de fechas del navegador en el paso de Programación: el
 * campo muestra la fecha y, al pulsarlo, se despliega el calendario del mes con
 * los festivos, la Semana Santa y la semana de receso, más la columna con el
 * número de semana.
 *
 * - Clic en una semana: ahí empieza (o termina) la etapa del campo.
 * - Clic en un día: la etapa empieza (o termina) ese día exacto.
 * - Arrastrando de una semana a otra: esa etapa ocupa ese rango.
 * - Botón × de la fila: saca esa semana del cronograma (o la devuelve).
 * Semana Santa y la semana de receso nunca entran y el cronograma las salta.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Eraser, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@esap-mfe/shared-ui/popover';
import {
  aplicarRangoEtapa,
  calcularProgramacion,
  fechaCorta,
  fechaYMD,
  fechasVacias,
  parseYMD,
  primerDiaHabil,
  programacionDesdeFechas,
  semanasDeVigencia,
  sumarDias,
  NOMBRE_BLOQUEO,
  NOMBRE_ETAPA,
  type EtapaCronograma,
  type FechasEtapas,
  type SemanaProgramada,
  type SemanaVigencia,
} from './services/calendarioVigencia';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

const ESTILO_ETAPA: Record<EtapaCronograma, { fila: string; chip: string; texto: string }> = {
  P: { fila: 'bg-blue-100 hover:bg-blue-200', chip: 'bg-blue-600', texto: 'text-blue-700' },
  E: { fila: 'bg-amber-100 hover:bg-amber-200', chip: 'bg-amber-500', texto: 'text-amber-700' },
  C: { fila: 'bg-emerald-100 hover:bg-emerald-200', chip: 'bg-emerald-600', texto: 'text-emerald-700' },
};

// Rojo para lo que no se trabaja por calendario (festivos, Semana Santa y
// receso); las semanas que el usuario saca quedan en blanco.
const ROJO_FESTIVO = '#D32F2F';
const rayas = (color: string, fondo: string) =>
  `repeating-linear-gradient(135deg, ${color} 0 4px, ${fondo} 4px 8px)`;
const FONDO_BLOQUEADA = rayas('#FCA5A5', '#FEF2F2');

export interface CambioCronograma {
  fechas: FechasEtapas;
  semanasExcluidas: string[];
}

interface Props {
  vigencia: number;
  /** Etapa a la que pertenece el campo */
  etapa: EtapaCronograma;
  /** Si el campo es la fecha de inicio o la de fin de esa etapa */
  extremo: 'inicio' | 'fin';
  valor?: string;
  fechas: Partial<FechasEtapas>;
  semanasExcluidas: string[];
  onCambio: (cambio: CambioCronograma) => void;
  deshabilitado?: boolean;
  soloLectura?: boolean;
}

export function CampoFechaCalendario({
  vigencia, etapa, extremo, valor, fechas, semanasExcluidas, onCambio, deshabilitado, soloLectura,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const semanas = useMemo(() => semanasDeVigencia(vigencia), [vigencia]);
  const programadas = useMemo(
    () => programacionDesdeFechas(vigencia, fechas, semanasExcluidas),
    [
      vigencia,
      fechas.fechaInicioPlaneacion, fechas.fechaFinPlaneacion,
      fechas.fechaInicioEjecucion, fechas.fechaFinEjecucion,
      fechas.fechaInicioComunicacion, fechas.fechaFinComunicacion,
      semanasExcluidas,
    ],
  );
  const porLunes = useMemo(() => new Map(programadas.map((p) => [p.semana.lunes, p])), [programadas]);
  const hayCronograma = programadas.some((p) => p.etapa);

  // Arrastre: se marca desde dónde y hasta dónde mientras el mouse está abajo
  const [arrastre, setArrastre] = useState<{ desde: number; hasta: number } | null>(null);
  const arrastrando = useRef(false);

  const mesDe = (fecha?: string) => {
    if (fecha) return parseYMD(fecha).getMonth();
    const hoy = new Date();
    return hoy.getFullYear() === vigencia ? hoy.getMonth() : 0;
  };
  const [mes, setMes] = useState(() => mesDe(valor));
  useEffect(() => { if (abierto) setMes(mesDe(valor || fechas.fechaInicioPlaneacion)); }, [abierto]);

  useEffect(() => {
    const soltar = () => { arrastrando.current = false; };
    window.addEventListener('mouseup', soltar);
    return () => window.removeEventListener('mouseup', soltar);
  }, []);

  const bloqueado = !!soloLectura || !!deshabilitado;

  const aplicar = (desde: number, hasta: number) => {
    const a = Math.min(desde, hasta);
    const b = Math.max(desde, hasta);
    // Un clic solo mueve el extremo del campo; el arrastre fija todo el rango
    if (a === b) {
      const propias = programadas.filter((p) => p.etapa === etapa).map((p) => p.semana.numero);
      const otro = extremo === 'inicio' ? propias[propias.length - 1] : propias[0];
      if (otro === undefined) {
        // Sin cronograma todavía: la primera selección arranca la Planeación
        const resultado = calcularProgramacion({ año: vigencia, inicio: semanas[a - 1].lunes, semanasExcluidas });
        onCambio({ fechas: resultado.fechas, semanasExcluidas });
        return;
      }
      const resultado = aplicarRangoEtapa(vigencia, fechas, semanasExcluidas, {
        etapa,
        desde: extremo === 'inicio' ? a : Math.min(otro, a),
        hasta: extremo === 'inicio' ? Math.max(otro, a) : b,
      });
      onCambio({ fechas: resultado.fechas, semanasExcluidas });
      return;
    }
    const resultado = aplicarRangoEtapa(vigencia, fechas, semanasExcluidas, { etapa, desde: a, hasta: b });
    onCambio({ fechas: resultado.fechas, semanasExcluidas });
  };

  /**
   * Clic en un día: ese día queda como inicio o fin exacto de la etapa. Primero
   * se acomoda el rango de semanas y luego se recorta el extremo al día elegido,
   * para poder decir "la Planeación va hasta el 18 de marzo".
   */
  const fijarDia = (semana: SemanaVigencia, dia: string) => {
    const propias = programadas.filter((p) => p.etapa === etapa).map((p) => p.semana.numero);
    const otro = extremo === 'inicio' ? propias[propias.length - 1] : propias[0];
    const resultado = otro === undefined
      ? calcularProgramacion({ año: vigencia, inicio: semana.lunes, semanasExcluidas })
      : aplicarRangoEtapa(vigencia, fechas, semanasExcluidas, {
          etapa,
          desde: extremo === 'inicio' ? semana.numero : Math.min(otro, semana.numero),
          hasta: extremo === 'inicio' ? Math.max(otro, semana.numero) : semana.numero,
        });

    const campo = extremo === 'inicio'
      ? ({ P: 'fechaInicioPlaneacion', E: 'fechaInicioEjecucion', C: 'fechaInicioComunicacion' } as const)[etapa]
      : ({ P: 'fechaFinPlaneacion', E: 'fechaFinEjecucion', C: 'fechaFinComunicacion' } as const)[etapa];

    onCambio({ fechas: { ...resultado.fechas, [campo]: dia }, semanasExcluidas });
  };

  const alternarExclusion = (semana: SemanaVigencia) => {
    const estado = porLunes.get(semana.lunes);
    const excluidas = estado?.excluida
      ? semanasExcluidas.filter((l) => l !== semana.lunes)
      : [...semanasExcluidas, semana.lunes];
    const inicio = fechas.fechaInicioPlaneacion || fechas.fechaInicioEjecucion || fechas.fechaInicioComunicacion;
    if (!inicio) { onCambio({ fechas: fechasVacias(), semanasExcluidas: excluidas }); return; }
    const resultado = calcularProgramacion({ año: vigencia, inicio, semanasExcluidas: excluidas });
    onCambio({ fechas: resultado.fechas, semanasExcluidas: excluidas });
  };

  const limpiar = () => onCambio({ fechas: fechasVacias(), semanasExcluidas: [] });

  const textoCampo = valor ? parseYMD(valor).toLocaleDateString('es-CO') : 'dd/mm/aaaa';

  return (
    <Popover open={abierto} onOpenChange={(v) => !bloqueado && setAbierto(v)}>
      <PopoverTrigger asChild disabled={bloqueado}>
        <button
          type="button"
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 text-sm transition-colors ${
            bloqueado ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
          }`}
        >
          <span className={valor ? 'text-gray-900' : 'text-muted-foreground'}>{textoCampo}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" />
        </button>
      </PopoverTrigger>

      {/* Ancho y z en estilo: las clases arbitrarias de Tailwind no se generan en
          este microfrontend, y el modal del formulario va en z-[9999] */}
      <PopoverContent
        className="border-gray-200 bg-white p-3 shadow-xl"
        style={{ width: '21rem', zIndex: 10000 }}
        align="start"
      >
        <div className="mb-1 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMes((m) => Math.max(0, m - 1))}
            disabled={mes === 0}
            className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-bold text-gray-900">{MESES[mes]} {vigencia}</p>
          <button
            type="button"
            onClick={() => setMes((m) => Math.min(11, m + 1))}
            disabled={mes === 11}
            className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-30"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-2 text-center text-[11px] font-semibold" style={{ color: etapa === 'P' ? '#1d4ed8' : etapa === 'E' ? '#b45309' : '#047857' }}>
          {NOMBRE_ETAPA[etapa]} · fecha de {extremo}
        </p>

        <Mes
          vigencia={vigencia}
          mes={mes}
          semanas={semanas}
          porLunes={porLunes}
          etapaCampo={etapa}
          extremo={extremo}
          valor={valor}
          arrastre={arrastre}
          soloLectura={bloqueado}
          onInicioArrastre={(n) => { arrastrando.current = true; setArrastre({ desde: n, hasta: n }); }}
          onPasarPor={(n) => { if (arrastrando.current) setArrastre((a) => (a ? { ...a, hasta: n } : a)); }}
          onSoltar={(n) => {
            const marca = arrastre;
            arrastrando.current = false;
            setArrastre(null);
            aplicar(marca ? marca.desde : n, n);
          }}
          onAlternarExclusion={alternarExclusion}
          onClicDia={fijarDia}
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-[10px] text-gray-600">
          <Leyenda color="bg-blue-500" texto="Planeación" />
          <Leyenda color="bg-amber-500" texto="Ejecución" />
          <Leyenda color="bg-emerald-500" texto="Comunicación" />
          <Leyenda fondo={ROJO_FESTIVO} texto="Festivo" />
          <Leyenda fondo={FONDO_BLOQUEADA} rayado texto="Semana Santa / Receso" />
          <Leyenda fondo="#FFFFFF" texto="Semana que quité" />
        </div>

        {!hayCronograma ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] leading-snug text-blue-800">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            Marque las semanas de la etapa arrastrando, o haga clic en un día para fijar esa fecha exacta. El ciclo 4-4-5 se completa solo, sin Semana Santa ni receso; pulsando el número de semana la quita o la vuelve a poner.
          </p>
        ) : (
          <ResumenEtapas programadas={programadas} fechas={fechas} />
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {hayCronograma && !bloqueado ? (
            <button
              type="button"
              onClick={limpiar}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Eraser className="h-3.5 w-3.5" />
              Limpiar
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-md bg-[#1e5da8] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#174a8a]"
          >
            Listo
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Leyenda({ color, fondo, rayado, texto }: { color?: string; fondo?: string; rayado?: boolean; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-sm border border-gray-300 ${color || ''}`}
        style={fondo ? (rayado ? { backgroundImage: fondo } : { backgroundColor: fondo }) : undefined}
      />
      {texto}
    </span>
  );
}

interface MesProps {
  vigencia: number;
  mes: number;
  semanas: SemanaVigencia[];
  porLunes: Map<string, SemanaProgramada>;
  etapaCampo: EtapaCronograma;
  /** Inicio o fin: define qué fija el clic sobre un día */
  extremo: 'inicio' | 'fin';
  /** Fecha del campo, para resaltar el día que está puesto */
  valor?: string;
  arrastre: { desde: number; hasta: number } | null;
  soloLectura: boolean;
  onInicioArrastre: (numero: number) => void;
  onPasarPor: (numero: number) => void;
  onSoltar: (numero: number) => void;
  onAlternarExclusion: (semana: SemanaVigencia) => void;
  onClicDia: (semana: SemanaVigencia, dia: string) => void;
}

function Mes({
  vigencia, mes, semanas, porLunes, etapaCampo, extremo, valor, arrastre, soloLectura,
  onInicioArrastre, onPasarPor, onSoltar, onAlternarExclusion, onClicDia,
}: MesProps) {
  const inicioMes = fechaYMD(new Date(vigencia, mes, 1));
  const finMes = fechaYMD(new Date(vigencia, mes + 1, 0));
  const filas = semanas.filter((s) => s.lunes <= finMes && s.domingo >= inicioMes);
  const hoy = fechaYMD(new Date());
  const enArrastre = (n: number) =>
    !!arrastre && n >= Math.min(arrastre.desde, arrastre.hasta) && n <= Math.max(arrastre.desde, arrastre.hasta);

  return (
    <table className="w-full select-none border-collapse text-xs">
      <thead>
        <tr className="text-[10px] font-semibold uppercase text-gray-400">
          <th className="w-8 pb-1 text-left">Sem</th>
          {DIAS.map((d) => (
            <th key={d} className={`pb-1 font-semibold ${d === 'Do' ? 'text-gray-500' : ''}`}>{d}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((semana) => {
          const estado = porLunes.get(semana.lunes);
          const bloqueada = !!semana.bloqueo;
          const etapa = estado?.etapa;
          const excluida = !!estado?.excluida;
          const clickeable = !soloLectura && !bloqueada;
          const marcada = enArrastre(semana.numero);
          const claseFila = marcada
            ? `${ESTILO_ETAPA[etapaCampo].fila} ring-2 ring-inset ring-[#1e5da8]`
            : excluida
              ? 'bg-white text-gray-400'
              : bloqueada
                ? 'text-red-800'
                : etapa
                  ? ESTILO_ETAPA[etapa].fila
                  : clickeable ? 'hover:bg-gray-100' : '';
          // Semana Santa y receso en rojo, igual que los festivos; lo que saca el
          // usuario queda en blanco para que se vea que no está programado.
          const estiloFila = !marcada && !excluida && bloqueada ? { backgroundImage: FONDO_BLOQUEADA } : undefined;
          const titulo = bloqueada
            ? `${NOMBRE_BLOQUEO[semana.bloqueo!]} (${fechaCorta(semana.lunes)} – ${fechaCorta(semana.domingo)}): no se programa`
            : excluida
              ? `Semana ${semana.numero} fuera del cronograma`
              : etapa
                ? `Semana ${semana.numero} · ${NOMBRE_ETAPA[etapa]}. Arrastre para marcar el rango`
                : `Semana ${semana.numero} (${fechaCorta(semana.lunes)} – ${fechaCorta(semana.domingo)})`;
          // Pulsar el número de semana la quita del cronograma o la devuelve
          const puedeExcluir = clickeable && (!!etapa || excluida);

          return (
            <tr
              key={semana.lunes}
              title={titulo}
              onMouseDown={() => clickeable && onInicioArrastre(semana.numero)}
              onMouseEnter={() => clickeable && onPasarPor(semana.numero)}
              onMouseUp={() => clickeable && onSoltar(semana.numero)}
              style={estiloFila}
              className={`group ${claseFila} ${clickeable ? 'cursor-pointer' : 'cursor-not-allowed'} transition-colors`}
            >
              <td className="py-0.5 pr-1 text-left">
                <button
                  type="button"
                  disabled={!puedeExcluir}
                  title={
                    puedeExcluir
                      ? (excluida ? 'Volver a poner esta semana en el cronograma' : 'Quitar esta semana del cronograma')
                      : undefined
                  }
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); if (puedeExcluir) onAlternarExclusion(semana); }}
                  className={`rounded px-0.5 font-bold ${excluida ? 'line-through' : ''} ${
                    bloqueada ? 'text-red-700' : etapa ? ESTILO_ETAPA[etapa].texto : 'text-gray-500'
                  } ${puedeExcluir ? 'cursor-pointer hover:bg-white/80 hover:underline' : ''}`}
                >
                  S{semana.numero}
                </button>
              </td>
              {DIAS.map((_, i) => {
                const fecha = sumarDias(parseYMD(semana.lunes), i);
                const ymd = fechaYMD(fecha);
                if (ymd < inicioMes || ymd > finMes) return <td key={i} />;
                const festivo = semana.festivos.find((f) => f.fecha === ymd);
                const esExtremo = valor === ymd;
                return (
                  <td key={i} className="py-0.5 text-center">
                    <span
                      title={festivo ? `${festivo.nombre} · festivo` : clickeable ? `Fijar el ${fecha.getDate()} como fecha de ${extremo}` : undefined}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); if (clickeable) onClicDia(semana, ymd); }}
                      style={festivo ? { backgroundColor: ROJO_FESTIVO } : undefined}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                        festivo ? 'font-bold text-white' : i === 6 ? 'text-gray-400' : ''
                      } ${esExtremo ? 'ring-2 ring-[#1e5da8] font-bold' : ''} ${ymd === hoy && !esExtremo ? 'ring-1 ring-orange-400' : ''} ${excluida ? 'line-through' : ''} ${clickeable ? 'cursor-pointer hover:ring-1 hover:ring-gray-400' : ''}`}
                    >
                      {fecha.getDate()}
                    </span>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ResumenEtapas({ programadas, fechas }: { programadas: SemanaProgramada[]; fechas: Partial<FechasEtapas> }) {
  const etapas: EtapaCronograma[] = ['P', 'E', 'C'];
  // Si se fijó un día exacto, el resumen muestra ese día y no el borde de la semana
  const guardadas: Record<EtapaCronograma, { inicio?: string; fin?: string }> = {
    P: { inicio: fechas.fechaInicioPlaneacion, fin: fechas.fechaFinPlaneacion },
    E: { inicio: fechas.fechaInicioEjecucion, fin: fechas.fechaFinEjecucion },
    C: { inicio: fechas.fechaInicioComunicacion, fin: fechas.fechaFinComunicacion },
  };

  return (
    <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
      {etapas.map((etapa) => {
        const propias = programadas.filter((p) => p.etapa === etapa);
        if (!propias.length) return null;
        const primera = propias[0].semana;
        const ultima = propias[propias.length - 1].semana;
        const entreMedio = programadas.filter(
          (p) => p.semana.numero > primera.numero && p.semana.numero < ultima.numero && (p.excluida || p.semana.bloqueo),
        );

        return (
          <div key={etapa} className="text-[11px] leading-snug">
            <span className={`mr-1 inline-block h-2 w-2 rounded-sm ${ESTILO_ETAPA[etapa].chip}`} />
            <span className={`font-bold ${ESTILO_ETAPA[etapa].texto}`}>{NOMBRE_ETAPA[etapa]}</span>
            <span className="text-gray-700">
              {' '}· {propias.length} sem · {fechaCorta(guardadas[etapa].inicio || primerDiaHabil(primera))} – {fechaCorta(guardadas[etapa].fin || ultima.domingo)}
            </span>
            {entreMedio.map((p) => (
              <span key={p.semana.lunes} className="block text-orange-700">
                salta {p.semana.bloqueo ? NOMBRE_BLOQUEO[p.semana.bloqueo] : `la semana ${p.semana.numero}`} ({fechaCorta(p.semana.lunes)} – {fechaCorta(p.semana.domingo)})
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
