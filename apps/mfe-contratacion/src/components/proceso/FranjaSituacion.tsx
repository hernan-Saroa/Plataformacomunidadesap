import React from 'react';
import { ArrowRight, Clock, Hourglass } from 'lucide-react';

import { Situacion } from './situacionDelProceso';
import { RASGOS_DEL_MOMENTO } from './rasgosDelMomento';
import { momento as fechaDelMomento } from '../shared/fechas';

interface Props {
  situacion: Situacion;
  /** La actividad que está abierta, para no ofrecer ir a donde ya se está. */
  abierta?: string | null;
  onIr?: (numeral: string) => void;
}

/** «hoy», «ayer», «hace 5 días». */
function haceCuanto(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

/**
 * Dónde está el proceso y a quién le toca, siempre a la vista.
 *
 * Antes eso solo se decía en el modal que salía justo después de enviar algo:
 * quien entraba en frío tenía que leer el riel numeral por numeral para
 * adivinar si el proceso avanzaba o a quién esperar. La franja responde lo
 * mismo en una línea —qué pasa, a quién le toca, por qué espera y desde
 * cuándo no se mueve— y lleva a la actividad con un clic.
 */
export function FranjaSituacion({ situacion, abierta = null, onIr }: Props) {
  const rasgos = RASGOS_DEL_MOMENTO[situacion.momento];
  const { Icono } = rasgos;
  const puedeIr = !!onIr && !!situacion.numeral && situacion.numeral !== abierta;

  return (
    <section
      aria-label="Situación del proceso"
      className={`mt-3 rounded-lg border px-3.5 py-3 flex items-start gap-3 flex-wrap ${
        situacion.teToca ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-slate-50'
      }`}
    >
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${rasgos.clase}`}
        aria-hidden="true"
      >
        <Icono className="w-4 h-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 m-0">
          Ahora · {rasgos.etiqueta}
        </p>
        <p className="text-sm font-bold text-slate-900 m-0 mt-0.5 leading-snug">
          {situacion.titulo}
        </p>

        {situacion.teToca ? (
          <p className="text-[13px] font-bold text-[#003DA5] m-0 mt-0.5">Te toca a ti</p>
        ) : situacion.quien ? (
          <p className="text-[13px] text-slate-600 m-0 mt-0.5">
            Le toca a <span className="font-bold text-slate-900">{situacion.quien}</span>
          </p>
        ) : null}

        {situacion.espera ? (
          <p className="text-[12px] text-amber-800 m-0 mt-1 flex items-start gap-1.5">
            <Hourglass className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            {situacion.espera}
          </p>
        ) : null}

        {situacion.ultimoMovimiento ? (
          <p className="text-[12px] text-slate-500 m-0 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            Último movimiento {haceCuanto(situacion.ultimoMovimiento)} ·{' '}
            {fechaDelMomento(situacion.ultimoMovimiento)}
          </p>
        ) : null}
      </div>

      {puedeIr ? (
        <button
          type="button"
          onClick={() => onIr!(situacion.numeral!)}
          className={`self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg
            transition-colors ${
              situacion.teToca
                ? 'bg-[#003DA5] text-white hover:opacity-90'
                : 'bg-white border border-gray-200 text-slate-700 hover:border-[#003DA5]/30 hover:text-[#003DA5]'
            }`}
        >
          Ir a la actividad {situacion.numeral}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
