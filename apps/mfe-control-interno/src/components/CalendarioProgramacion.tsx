/**
 * Calendario anual para programar la auditoría (EFDS-2132).
 *
 * Reemplaza el selector de fecha del navegador: muestra el año de la vigencia
 * con los festivos, la Semana Santa y la semana de receso, y la columna "S"
 * con el número de semana para escoger cuáles entran y cuáles no.
 *
 * - Clic en una semana vacía: Planeación arranca ahí y el resto se llena solo (4-4-5).
 * - Clic en una semana pintada: se saca del cronograma y las demás se corren.
 * - Clic en una semana sacada: vuelve a entrar.
 * Las semanas de Semana Santa y de receso nunca entran.
 */

import { useMemo } from 'react';
import { Eraser, Info } from 'lucide-react';
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
  const hoy = fechaYMD(new Date());
  const hayCronograma = programadas.some((p) => p.etapa);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
          <Leyenda color="bg-blue-500" texto="Planeación" />
          <Leyenda color="bg-amber-500" texto="Ejecución" />
          <Leyenda color="bg-emerald-500" texto="Comunicación" />
          <Leyenda color="bg-teal-500" texto="Festivo" />
          <Leyenda color="bg-orange-300" texto="Semana Santa / Receso" />
          <Leyenda color="bg-gray-300" texto="Semana excluida" />
        </div>
        {!soloLectura && hayCronograma && (
          <button
            type="button"
            onClick={limpiar}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            <Eraser className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {!hayCronograma && !soloLectura && (
        <p className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <Info className="h-4 w-4 shrink-0" />
          Haga clic en la semana en que inicia la Planeación: el ciclo 4-4-5 se llena solo saltando Semana Santa y la semana de receso. Clic en una semana pintada la saca del cronograma.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MESES.map((nombreMes, mes) => (
          <Mes
            key={mes}
            vigencia={vigencia}
            mes={mes}
            nombre={nombreMes}
            semanas={semanas}
            porLunes={porLunes}
            hoy={hoy}
            soloLectura={!!soloLectura}
            onClicSemana={manejarClic}
          />
        ))}
      </div>

      {hayCronograma && <ResumenEtapas programadas={programadas} />}
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
      {texto}
    </span>
  );
}

interface MesProps {
  vigencia: number;
  mes: number;
  nombre: string;
  semanas: SemanaVigencia[];
  porLunes: Map<string, SemanaProgramada>;
  hoy: string;
  soloLectura: boolean;
  onClicSemana: (semana: SemanaVigencia) => void;
}

function Mes({ vigencia, mes, nombre, semanas, porLunes, hoy, soloLectura, onClicSemana }: MesProps) {
  const inicioMes = fechaYMD(new Date(vigencia, mes, 1));
  const finMes = fechaYMD(new Date(vigencia, mes + 1, 0));
  const filas = semanas.filter((s) => s.lunes <= finMes && s.domingo >= inicioMes);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2">
      <p className="mb-1 text-center text-xs font-bold text-gray-800">{nombre} {vigencia}</p>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="text-[10px] font-semibold uppercase text-gray-400">
            <th className="w-8 pb-0.5 text-left">Sem</th>
            {DIAS.map((d) => (
              <th key={d} className={`pb-0.5 font-semibold ${d === 'Do' ? 'text-gray-500' : ''}`}>{d}</th>
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
                <td className={`py-px pr-1 text-left font-bold ${excluida ? 'line-through' : ''} ${bloqueada ? 'text-orange-700' : etapa ? ESTILO_ETAPA[etapa].texto : 'text-gray-500'}`}>
                  S{semana.numero}
                </td>
                {DIAS.map((_, i) => {
                  const fecha = sumarDias(parseYMD(semana.lunes), i);
                  const ymd = fechaYMD(fecha);
                  if (ymd < inicioMes || ymd > finMes) return <td key={i} />;
                  const festivo = semana.festivos.find((f) => f.fecha === ymd);
                  const esHoy = ymd === hoy;
                  const esDomingo = i === 6;
                  return (
                    <td key={i} className="py-px text-center">
                      <span
                        title={festivo?.nombre}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                          festivo
                            ? 'bg-teal-500 font-bold text-white'
                            : esDomingo ? 'text-gray-400' : ''
                        } ${esHoy ? 'ring-2 ring-orange-500' : ''} ${excluida ? 'line-through' : ''}`}
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
    </div>
  );
}

function ResumenEtapas({ programadas }: { programadas: SemanaProgramada[] }) {
  const etapas: EtapaCronograma[] = ['P', 'E', 'C'];

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {etapas.map((etapa) => {
        const propias = programadas.filter((p) => p.etapa === etapa);
        if (!propias.length) {
          return (
            <div key={etapa} className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">
              <span className={`mr-1 inline-block h-2.5 w-2.5 rounded-sm ${ESTILO_ETAPA[etapa].chip}`} />
              {NOMBRE_ETAPA[etapa]}: sin semanas
            </div>
          );
        }
        const primera = propias[0].semana;
        const ultima = propias[propias.length - 1].semana;
        const entreMedio = programadas.filter(
          (p) => p.semana.numero > primera.numero && p.semana.numero < ultima.numero && (p.excluida || p.semana.bloqueo),
        );
        const festivos = propias.flatMap((p) => p.semana.festivos);

        return (
          <div key={etapa} className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
            <p className={`font-bold ${ESTILO_ETAPA[etapa].texto}`}>
              <span className={`mr-1 inline-block h-2.5 w-2.5 rounded-sm ${ESTILO_ETAPA[etapa].chip}`} />
              {NOMBRE_ETAPA[etapa]} · {propias.length} semana{propias.length === 1 ? '' : 's'}
            </p>
            <p className="mt-1 text-gray-800">
              Semanas {primera.numero}{ultima.numero !== primera.numero ? `–${ultima.numero}` : ''}: {fechaCorta(primerDiaHabil(primera))} – {fechaCorta(ultima.domingo)}
            </p>
            {entreMedio.map((p) => (
              <p key={p.semana.lunes} className="mt-0.5 text-orange-700">
                Salta {p.semana.bloqueo ? NOMBRE_BLOQUEO[p.semana.bloqueo] : `la semana ${p.semana.numero} (excluida)`}: {fechaCorta(p.semana.lunes)} – {fechaCorta(p.semana.domingo)}
              </p>
            ))}
            {festivos.length > 0 && (
              <p className="mt-0.5 text-teal-700">
                Festivo{festivos.length === 1 ? '' : 's'}: {festivos.map((f) => `${fechaCorta(f.fecha)} (${f.nombre})`).join(', ')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
