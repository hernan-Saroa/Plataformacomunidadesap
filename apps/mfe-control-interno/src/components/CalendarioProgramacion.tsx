/**
 * Campo de fecha con calendario de la vigencia (EFDS-2132).
 *
 * Reemplaza al selector de fechas del navegador en el paso de Programación: el
 * campo muestra la fecha y, al pulsarlo, se despliega el calendario del mes con
 * los festivos, la Semana Santa y la semana de receso, más la columna con el
 * número de semana.
 *
 * - Clic en una semana: la marca o la desmarca.
 * - Clic en dos números de semana (S10 y luego S13): la etapa va de una a otra,
 *   igual que arrastrando, y sirve aunque estén en meses distintos.
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
  // Semana marcada con el primer clic, a la espera del segundo que cierra el rango
  const [anclaje, setAnclaje] = useState<number | null>(null);

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

  /** Clic en una semana: la marca si está fuera, la desmarca si está dentro. */
  const alternarSemana = (semana: SemanaVigencia) => {
    const estado = porLunes.get(semana.lunes);
    if (estado?.etapa || estado?.excluida) { alternarExclusion(semana); return; }

    // Estaba fuera del cronograma: la etapa del campo se estira hasta ella
    const propias = programadas.filter((p) => p.etapa === etapa).map((p) => p.semana.numero);
    if (!propias.length) {
      const resultado = calcularProgramacion({ año: vigencia, inicio: semana.lunes, semanasExcluidas });
      onCambio({ fechas: resultado.fechas, semanasExcluidas });
      return;
    }
    aplicarRango(
      Math.min(propias[0], semana.numero),
      Math.max(propias[propias.length - 1], semana.numero),
    );
  };

  const aplicar = (desde: number, hasta: number) => {
    const a = Math.min(desde, hasta);
    const b = Math.max(desde, hasta);
    if (a !== b) { setAnclaje(null); aplicarRango(a, b); return; }
    alternarSemana(semanas[a - 1]);
  };

  /** Clic en un número de semana: el primero abre el rango y el segundo lo cierra. */
  const marcarExtremo = (semana: SemanaVigencia) => {
    if (anclaje === null || anclaje === semana.numero) { setAnclaje(semana.numero); return; }
    const a = Math.min(anclaje, semana.numero);
    const b = Math.max(anclaje, semana.numero);
    setAnclaje(null);
    aplicarRango(a, b);
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
          {anclaje !== null
            ? `Desde la semana ${anclaje}: elija hasta cuál`
            : `${NOMBRE_ETAPA[etapa]} · fecha de ${extremo}`}
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
          anclaje={anclaje}
          soloLectura={bloqueado}
          onInicioArrastre={(n) => { arrastrando.current = true; setArrastre({ desde: n, hasta: n }); }}
          onPasarPor={(n) => { if (arrastrando.current) setArrastre((a) => (a ? { ...a, hasta: n } : a)); }}
          onSoltar={(n) => {
            const marca = arrastre;
            arrastrando.current = false;
            setArrastre(null);
            aplicar(marca ? marca.desde : n, n);
          }}
          onClicNumero={marcarExtremo}
        />

        {!hayCronograma ? (
          <p className="mt-2 flex items-start gap-1.5 rounded bg-blue-50 px-2 py-1.5 text-[11px] leading-snug text-blue-800">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" />
            Clic en una semana para marcarla; clic en dos números (S10 y S13) para ir de una a otra.
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
  /** Fecha del campo, para resaltar el día que está puesto */
  valor?: string;
  arrastre: { desde: number; hasta: number } | null;
  /** Semana marcada con el primer clic en un número, esperando el segundo */
  anclaje: number | null;
  soloLectura: boolean;
  onInicioArrastre: (numero: number) => void;
  onPasarPor: (numero: number) => void;
  onSoltar: (numero: number) => void;
  onClicNumero: (semana: SemanaVigencia) => void;
}

function Mes({
  vigencia, mes, semanas, porLunes, etapaCampo, valor, arrastre, anclaje, soloLectura,
  onInicioArrastre, onPasarPor, onSoltar, onClicNumero,
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
          const anclada = anclaje === semana.numero;
          const claseFila = marcada || anclada
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
                : `Semana ${semana.numero} (${fechaCorta(semana.lunes)} – ${fechaCorta(semana.domingo)})`;

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
                  title={anclaje === null
                    ? `Desde la semana ${semana.numero}`
                    : anclada ? 'Cancelar' : `De la semana ${anclaje} a la ${semana.numero}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); if (clickeable) onClicNumero(semana); }}
                  className={`rounded px-0.5 font-bold ${excluida ? 'line-through' : ''} ${
                    anclada ? 'bg-[#1e5da8] text-white' : bloqueada ? 'text-red-700' : etapa ? ESTILO_ETAPA[etapa].texto : 'text-gray-500'
                  } ${clickeable ? 'cursor-pointer hover:bg-white/80 hover:underline' : ''}`}
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
                      title={festivo ? `${festivo.nombre} · festivo` : undefined}
                      style={festivo ? { backgroundColor: ROJO_FESTIVO } : undefined}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded ${
                        festivo ? 'font-bold text-white' : i === 6 ? 'text-gray-400' : ''
                      } ${esExtremo ? 'ring-2 ring-[#1e5da8] font-bold' : ''} ${ymd === hoy && !esExtremo ? 'ring-1 ring-orange-400' : ''} ${excluida ? 'line-through' : ''}`}
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
