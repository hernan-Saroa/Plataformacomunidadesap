/**
 * Selector de cronograma con calendario (EFDS-2132).
 *
 * Se abre desde el campo, igual que el calendario del navegador, pero muestra
 * el mes con los festivos, la Semana Santa y la semana de receso, y una columna
 * con el número de semana para escoger cuáles entran en la auditoría.
 *
 * - Clic en una semana vacía: Planeación arranca ahí y el resto se llena solo (4-4-5).
 * - Clic en una semana pintada: se saca del cronograma y las demás se corren.
 * - Clic en una semana sacada: vuelve a entrar.
 * Las semanas de Semana Santa y de receso nunca entran.
 */

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Eraser, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@esap-mfe/shared-ui/popover';
import {
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

interface Props {
  vigencia: number;
  fechas: Partial<FechasEtapas>;
  semanasExcluidas: string[];
  onCambio: (cambio: { fechas: FechasEtapas; semanasExcluidas: string[] }) => void;
  soloLectura?: boolean;
}

export function CalendarioProgramacion({ vigencia, fechas, semanasExcluidas, onCambio, soloLectura }: Props) {
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

  // El mes que se ve arranca en el de la auditoría (o en el actual si es la vigencia en curso)
  const mesInicial = () => {
    const inicio = fechas.fechaInicioPlaneacion || fechas.fechaInicioEjecucion || fechas.fechaInicioComunicacion;
    if (inicio) return parseYMD(inicio).getMonth();
    const hoy = new Date();
    return hoy.getFullYear() === vigencia ? hoy.getMonth() : 0;
  };
  const [mes, setMes] = useState(mesInicial);
  useEffect(() => { if (abierto) setMes(mesInicial()); }, [abierto]);

  const manejarClic = (semana: SemanaVigencia) => {
    if (soloLectura || semana.bloqueo) return;
    const estado = porLunes.get(semana.lunes);
    let excluidas = semanasExcluidas;
    let inicio = fechas.fechaInicioPlaneacion || fechas.fechaInicioEjecucion || fechas.fechaInicioComunicacion || '';

    if (estado?.excluida) {
      excluidas = excluidas.filter((l) => l !== semana.lunes);
    } else if (estado?.etapa) {
      excluidas = [...excluidas, semana.lunes];
    } else {
      inicio = semana.lunes;
    }
    if (!inicio) return;

    const resultado = calcularProgramacion({ año: vigencia, inicio, semanasExcluidas: excluidas });
    onCambio({ fechas: resultado.fechas, semanasExcluidas: excluidas });
  };

  const limpiar = () => onCambio({ fechas: fechasVacias(), semanasExcluidas: [] });

  const resumenBoton = hayCronograma
    ? `${fechaCorta(fechas.fechaInicioPlaneacion || fechas.fechaInicioEjecucion || fechas.fechaInicioComunicacion || '')} – ${fechaCorta(fechas.fechaFinComunicacion || fechas.fechaFinEjecucion || fechas.fechaFinPlaneacion || '', true)}`
    : `Seleccione las semanas en el calendario ${vigencia}`;

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild disabled={soloLectura}>
        <button
          type="button"
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 text-sm transition-colors ${
            soloLectura ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
          }`}
        >
          <span className={hayCronograma ? 'font-medium text-gray-900' : 'text-muted-foreground'}>
            {resumenBoton}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" />
        </button>
      </PopoverTrigger>

      {/* z alto y fondo propio: el modal del formulario va en z-[9999] */}
      <PopoverContent className="z-[10000] w-[22rem] border-gray-200 bg-white p-3 shadow-xl" align="start">
        <div className="mb-2 flex items-center justify-between">
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

        <Mes
          vigencia={vigencia}
          mes={mes}
          semanas={semanas}
          porLunes={porLunes}
          soloLectura={!!soloLectura}
          onClicSemana={manejarClic}
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-[10px] text-gray-600">
          <Leyenda color="bg-blue-500" texto="Planeación" />
          <Leyenda color="bg-amber-500" texto="Ejecución" />
          <Leyenda color="bg-emerald-500" texto="Comunicación" />
          <Leyenda color="bg-teal-500" texto="Festivo" />
          <Leyenda color="bg-orange-300" texto="Semana Santa / Receso" />
          <Leyenda color="bg-gray-300" texto="Excluida" />
        </div>

        {!hayCronograma ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] leading-snug text-blue-800">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            Haga clic en la semana en que inicia la Planeación. El ciclo 4-4-5 se llena solo, sin Semana Santa ni receso; clic en una semana pintada la saca del cronograma.
          </p>
        ) : (
          <ResumenEtapas programadas={programadas} />
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          {hayCronograma && !soloLectura ? (
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

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${color}`} />
      {texto}
    </span>
  );
}

interface MesProps {
  vigencia: number;
  mes: number;
  semanas: SemanaVigencia[];
  porLunes: Map<string, SemanaProgramada>;
  soloLectura: boolean;
  onClicSemana: (semana: SemanaVigencia) => void;
}

function Mes({ vigencia, mes, semanas, porLunes, soloLectura, onClicSemana }: MesProps) {
  const inicioMes = fechaYMD(new Date(vigencia, mes, 1));
  const finMes = fechaYMD(new Date(vigencia, mes + 1, 0));
  const filas = semanas.filter((s) => s.lunes <= finMes && s.domingo >= inicioMes);
  const hoy = fechaYMD(new Date());

  return (
    <table className="w-full border-collapse text-xs">
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
          const claseFila = excluida
            ? 'bg-gray-200 text-gray-400'
            : bloqueada
              ? 'bg-orange-100 text-orange-900'
              : etapa
                ? ESTILO_ETAPA[etapa].fila
                : clickeable ? 'hover:bg-gray-100' : '';
          const titulo = bloqueada
            ? `${NOMBRE_BLOQUEO[semana.bloqueo!]} (${fechaCorta(semana.lunes)} – ${fechaCorta(semana.domingo)}): no se programa`
            : excluida
              ? `Semana ${semana.numero} excluida del cronograma. Clic para devolverla`
              : etapa
                ? `Semana ${semana.numero} · ${NOMBRE_ETAPA[etapa]}. Clic para sacarla del cronograma`
                : `Semana ${semana.numero} (${fechaCorta(semana.lunes)} – ${fechaCorta(semana.domingo)}). Clic para iniciar aquí`;

          return (
            <tr
              key={semana.lunes}
              title={titulo}
              onClick={() => clickeable && onClicSemana(semana)}
              className={`${claseFila} ${clickeable ? 'cursor-pointer' : 'cursor-not-allowed'} transition-colors`}
            >
              <td className={`py-0.5 pr-1 text-left font-bold ${excluida ? 'line-through' : ''} ${bloqueada ? 'text-orange-700' : etapa ? ESTILO_ETAPA[etapa].texto : 'text-gray-500'}`}>
                S{semana.numero}
              </td>
              {DIAS.map((_, i) => {
                const fecha = sumarDias(parseYMD(semana.lunes), i);
                const ymd = fechaYMD(fecha);
                if (ymd < inicioMes || ymd > finMes) return <td key={i} />;
                const festivo = semana.festivos.find((f) => f.fecha === ymd);
                return (
                  <td key={i} className="py-0.5 text-center">
                    <span
                      title={festivo?.nombre}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                        festivo ? 'bg-teal-500 font-bold text-white' : i === 6 ? 'text-gray-400' : ''
                      } ${ymd === hoy ? 'ring-2 ring-orange-500' : ''} ${excluida ? 'line-through' : ''}`}
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

function ResumenEtapas({ programadas }: { programadas: SemanaProgramada[] }) {
  const etapas: EtapaCronograma[] = ['P', 'E', 'C'];

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
              {' '}· {propias.length} sem · {fechaCorta(primerDiaHabil(primera))} – {fechaCorta(ultima.domingo)}
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
