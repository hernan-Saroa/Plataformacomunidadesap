import React from 'react';
import { Ban, Check, Clock, Lock, Undo2 } from 'lucide-react';

import { EscalonDeRonda, RondaDeAprobacion } from '../../types';
import { momento } from './fechas';

/** Días entre dos instantes, para decir cuánto lleva o llevó un escalón. */
export function diasEntre(desde: string | null, hasta: string | null = null): number | null {
  if (!desde) return null;
  const fin = hasta ? new Date(hasta).getTime() : Date.now();
  return Math.max(0, Math.floor((fin - new Date(desde).getTime()) / 86_400_000));
}

const ESTADO: Record<EscalonDeRonda['estado'], { texto: string; clase: string }> = {
  PENDIENTE: { texto: 'Le toca', clase: 'bg-blue-50 text-[#003DA5]' },
  APROBADO: { texto: 'Aprobó', clase: 'bg-emerald-50 text-emerald-700' },
  DEVUELTO: { texto: 'Devolvió', clase: 'bg-amber-50 text-amber-700' },
  NEGADO: { texto: 'Negó', clase: 'bg-red-50 text-red-700' },
  BLOQUEADO: { texto: 'Después', clase: 'bg-slate-100 text-slate-500' },
  ANULADO: { texto: 'No llegó', clase: 'bg-slate-100 text-slate-400' },
};

const Icono = ({ estado }: { estado: EscalonDeRonda['estado'] }) => {
  const clase = 'w-2.5 h-2.5';
  if (estado === 'APROBADO') return <Check className={`${clase} text-emerald-700`} strokeWidth={3.5} />;
  if (estado === 'DEVUELTO') return <Undo2 className={`${clase} text-amber-700`} strokeWidth={3} />;
  if (estado === 'NEGADO') return <Ban className={`${clase} text-red-700`} strokeWidth={3} />;
  if (estado === 'PENDIENTE') return <Clock className={`${clase} text-[#003DA5]`} strokeWidth={3} />;
  return <Lock className={`${clase} text-slate-400`} strokeWidth={3} />;
};

/**
 * Los escalones de la ronda, en orden: quién aprobó, a quién le toca y quién
 * viene después (migración 101).
 *
 * Una lista y no un gráfico: en la columna del panel cabe a lo alto, y cada
 * escalón necesita su nombre, quién responde y cuánto lleva, que en un riel
 * horizontal no caben sin recortar.
 *
 * Una cadena de un solo escalón no se pinta: sería una lista de uno que repite
 * lo que el aviso ya dice («Espera a…»).
 */
export function EscalonesDeLaRonda({ ronda }: { ronda: RondaDeAprobacion | null }) {
  if (!ronda || ronda.escalones.length < 2) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold text-slate-500 m-0">
        {ronda.nombre ?? 'Cadena de aprobación'}
        {ronda.ronda > 1 ? ` · envío ${ronda.ronda}` : ''}
      </p>
      <ol className="m-0 p-0 list-none space-y-1.5">
        {ronda.escalones.map((e) => {
          const estado = ESTADO[e.estado];
          const dias =
            e.estado === 'PENDIENTE'
              ? diasEntre(e.activadoAt)
              : e.resueltoAt && e.activadoAt
                ? diasEntre(e.activadoAt, e.resueltoAt)
                : null;
          const ultima = e.decisiones[e.decisiones.length - 1];

          return (
            <li
              key={e.orden}
              className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${
                e.estado === 'PENDIENTE' ? 'border-blue-200 bg-white' : 'border-gray-100 bg-white'
              }`}
              aria-current={e.estado === 'PENDIENTE' ? 'step' : undefined}
            >
              <span
                className="w-4 h-4 rounded-full bg-slate-50 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <Icono estado={e.estado} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold text-slate-800 m-0 leading-snug">
                  {e.orden}. {e.nombre}
                </p>
                <p className="text-[11px] text-slate-500 m-0 leading-snug break-words">
                  {e.responsables.join(' o ') || 'Sin responsable'}
                  {e.reglaDecision === 'TODOS' ? ' · deben aprobar todos' : ''}
                </p>
                {ultima ? (
                  <p className="text-[10.5px] text-slate-400 m-0 tabular-nums">
                    {ultima.revisadoPor} · {momento(ultima.fecha)}
                  </p>
                ) : null}
              </div>
              <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span className={`px-1.5 py-0.5 rounded-md text-[10.5px] font-bold ${estado.clase}`}>
                  {estado.texto}
                </span>
                {dias !== null ? (
                  <span className="text-[10.5px] text-slate-400 tabular-nums">
                    {dias === 0 ? 'hoy' : dias === 1 ? '1 día' : `${dias} días`}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
