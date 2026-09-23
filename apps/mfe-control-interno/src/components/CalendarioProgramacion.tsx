/**
 * Campo de fecha con calendario de la vigencia (EFDS-2132).
 *
 * Reemplaza al selector de fechas del navegador en el paso de Programación: el
 * campo muestra la fecha y, al pulsarlo, se despliega el calendario del mes con
 * los festivos, la Semana Santa y la semana de receso, más la columna con el
 * número de semana.
 *
 * - Clic en el número de la semana (S12): la marca o la desmarca entera, y
 *   arrastrando de un número a otro la etapa ocupa ese rango.
 * - Clic en un día: la etapa empieza o termina ese día exacto, para no tener que
 *   tomar la semana completa.
 * Semana Santa y la semana de receso nunca entran y el cronograma las salta.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Eraser, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@esap-mfe/shared-ui/popover';
import {
  ajustarSemanaEtapa,
  aplicarRangoEtapa,
  calcularProgramacion,
  DURACION_ESTANDAR,
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
  const campoInicio = ({ P: 'fechaInicioPlaneacion', E: 'fechaInicioEjecucion', C: 'fechaInicioComunicacion' } as const)[etapa];
  const campoFin = ({ P: 'fechaFinPlaneacion', E: 'fechaFinEjecucion', C: 'fechaFinComunicacion' } as const)[etapa];

  /**
   * Marcar un rango es decir "esta etapa va desde aquí hasta allá", así que las
   * semanas que se habían quitado dentro de ese rango vuelven a entrar; las de
   * Semana Santa y receso siguen fuera porque no dependen del usuario.
   */
  const aplicarRango = (a: number, b: number) => {
    const dentro = (lunes: string) => {
      const s = semanas.find((x) => x.lunes === lunes);
      return !!s && s.numero >= a && s.numero <= b;
    };
    const excluidas = semanasExcluidas.filter((lunes) => !dentro(lunes));
    const resultado = aplicarRangoEtapa(vigencia, fechas, excluidas, { etapa, desde: a, hasta: b });
    onCambio({ fechas: resultado.fechas, semanasExcluidas: excluidas });
  };

  /**
   * Clic en una semana: la desmarca si ya está en la etapa; si está fuera, pasa
   * a ser la primera o la última según el campo desde el que se abrió el
   * calendario (fecha de inicio o fecha de fin).
   */
  const alternarSemana = (semana: SemanaVigencia) => {
    // Sin cronograma todavía, el primer clic propone el ciclo 4-4-5 completo
    if (!hayCronograma) {
      const arranque = extremo === 'fin'
        ? semanaRetrocediendo(semana.numero, DURACION_ESTANDAR[etapa] - 1)
        : semana.numero;
      const resultado = calcularProgramacion({ año: vigencia, inicio: semanas[arranque - 1].lunes, semanasExcluidas });
      onCambio({ fechas: resultado.fechas, semanasExcluidas });
      return;
    }
    // Después, cada clic solo marca o desmarca esa semana en la etapa del campo:
    // las demás etapas no se mueven y no se pierde lo ya marcado.
    const resultado = ajustarSemanaEtapa(vigencia, fechas, semanasExcluidas, etapa, semana.numero);
    onCambio(resultado);
  };

  /** Retrocede n semanas que cuenten (ni bloqueadas ni excluidas). */
  const semanaRetrocediendo = (desde: number, n: number) => {
    let numero = desde;
    let faltan = n;
    while (faltan > 0 && numero > 1) {
      numero -= 1;
      const s = semanas[numero - 1];
      if (s && !s.bloqueo && !semanasExcluidas.includes(s.lunes)) faltan -= 1;
    }
    return numero;
  };


  const aplicar = (desde: number, hasta: number) => {
    const a = Math.min(desde, hasta);
    const b = Math.max(desde, hasta);
    if (a !== b) { aplicarRango(a, b); return; }
    alternarSemana(semanas[a - 1]);
  };

  /**
   * Clic en un día: ese día queda como inicio o fin de la etapa, para cortar a
   * mitad de semana. Primero se acomoda el rango de semanas y después se recorta
   * el extremo al día elegido.
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

    onCambio({
      fechas: { ...resultado.fechas, [extremo === 'inicio' ? campoInicio : campoFin]: dia },
      semanasExcluidas,
    });
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
          rango={{ inicio: fechas[campoInicio], fin: fechas[campoFin] }}
          soloLectura={bloqueado}
          onInicioArrastre={(n) => { arrastrando.current = true; setArrastre({ desde: n, hasta: n }); }}
          onPasarPor={(n) => { if (arrastrando.current) setArrastre((a) => (a ? { ...a, hasta: n } : a)); }}
          onSoltar={(n) => {
            const marca = arrastre;
            arrastrando.current = false;
            setArrastre(null);
            aplicar(marca ? marca.desde : n, n);
          }}
          onClicNumero={alternarSemana}
          onClicDia={fijarDia}
        />

        {!hayCronograma ? (
          <p className="mt-2 flex items-start gap-1.5 rounded bg-blue-50 px-2 py-1.5 text-[11px] leading-snug text-blue-800">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            Clic en el número (S12) para la semana entera; clic en un día si la {NOMBRE_ETAPA[etapa]} {extremo === 'inicio' ? 'empieza' : 'termina'} a mitad de semana.
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
  /** Inicio o fin: lo que fija el clic sobre una semana */
  extremo: 'inicio' | 'fin';
  /** Fecha del campo, para resaltar el día que está puesto */
  valor?: string;
  arrastre: { desde: number; hasta: number } | null;
  /** Fechas reales de la etapa, para apagar los días que quedan fuera del corte */
  rango: { inicio?: string; fin?: string };
  soloLectura: boolean;
  onInicioArrastre: (numero: number) => void;
  onPasarPor: (numero: number) => void;
  onSoltar: (numero: number) => void;
  onClicNumero: (semana: SemanaVigencia) => void;
  onClicDia: (semana: SemanaVigencia, dia: string) => void;
}

function Mes({
  vigencia, mes, semanas, porLunes, etapaCampo, extremo, valor, arrastre, rango, soloLectura,
  onInicioArrastre, onPasarPor, onSoltar, onClicNumero, onClicDia,
}: MesProps) {
  const inicioMes = fechaYMD(new Date(vigencia, mes, 1));
  const finMes = fechaYMD(new Date(vigencia, mes + 1, 0));
  // Cada semana se muestra en un solo mes (el de su jueves, como en el Excel):
  // si salía en los dos, marcarla desde el mes siguiente corría la fecha al anterior.
  const filas = semanas.filter((s) => s.mes === mes);
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
            ? `${NOMBRE_BLOQUEO[semana.bloqueo!]}: no se programa`
            : excluida
              ? `Semana ${semana.numero} desmarcada · clic para volver a marcarla`
              : etapa
                ? `Semana ${semana.numero} · ${NOMBRE_ETAPA[etapa]} · clic para desmarcarla`
                : `Semana ${semana.numero} como ${extremo} de la ${NOMBRE_ETAPA[etapaCampo]} (${fechaCorta(semana.lunes)} – ${fechaCorta(semana.domingo)})`;

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
                  disabled={!clickeable}
                  title={titulo}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); if (clickeable) onClicNumero(semana); }}
                  className={`rounded px-0.5 font-bold ${excluida ? 'line-through' : ''} ${
                    bloqueada ? 'text-red-700' : etapa ? ESTILO_ETAPA[etapa].texto : 'text-gray-500'
                  } ${clickeable ? 'cursor-pointer hover:bg-white/80' : ''}`}
                >
                  S{semana.numero}
                </button>
              </td>
              {DIAS.map((_, i) => {
                const fecha = sumarDias(parseYMD(semana.lunes), i);
                const ymd = fechaYMD(fecha);
                // Los días del mes vecino se ven en gris, como en cualquier calendario
                const deOtroMes = ymd < inicioMes || ymd > finMes;
                const festivo = semana.festivos.find((f) => f.fecha === ymd);
                const esExtremo = valor === ymd;
                // Días de la semana que quedan fuera por un corte a mitad de semana
                const fueraDelCorte = !!etapa && (
                  (!!rango.inicio && ymd < rango.inicio) || (!!rango.fin && ymd > rango.fin)
                );
                return (
                  <td key={i} className="py-0.5 text-center">
                    <span
                      title={festivo
                        ? `${festivo.nombre} · festivo`
                        : clickeable ? `${extremo === 'inicio' ? 'Empezar' : 'Terminar'} el ${fecha.getDate()}` : undefined}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); if (clickeable) onClicDia(semana, ymd); }}
                      style={festivo ? { backgroundColor: ROJO_FESTIVO } : undefined}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                        festivo ? 'font-bold text-white' : deOtroMes ? 'text-gray-300' : i === 6 ? 'text-gray-400' : ''
                      } ${esExtremo ? 'ring-2 ring-[#1e5da8] font-bold' : ''} ${ymd === hoy && !esExtremo ? 'ring-1 ring-orange-400' : ''} ${excluida ? 'line-through' : ''} ${fueraDelCorte ? 'opacity-30' : ''} ${clickeable ? 'cursor-pointer hover:ring-1 hover:ring-gray-400' : ''}`}
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
  const guardadas: Record<EtapaCronograma, { inicio?: string; fin?: string }> = {
    P: { inicio: fechas.fechaInicioPlaneacion, fin: fechas.fechaFinPlaneacion },
    E: { inicio: fechas.fechaInicioEjecucion, fin: fechas.fechaFinEjecucion },
    C: { inicio: fechas.fechaInicioComunicacion, fin: fechas.fechaFinComunicacion },
  };

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      {etapas.map((etapa) => {
        const propias = programadas.filter((p) => p.etapa === etapa);
        if (!propias.length) return null;
        const primera = propias[0].semana;
        const ultima = propias[propias.length - 1].semana;

        return (
          <div key={etapa} className="text-[11px] leading-snug">
            <span className={`mr-1 inline-block h-2 w-2 rounded-sm ${ESTILO_ETAPA[etapa].chip}`} />
            <span className={`font-bold ${ESTILO_ETAPA[etapa].texto}`}>{NOMBRE_ETAPA[etapa]}</span>
            <span className="text-gray-700">
              {' '}{propias.length} sem · {fechaCorta(guardadas[etapa].inicio || primerDiaHabil(primera))} – {fechaCorta(guardadas[etapa].fin || ultima.domingo)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
