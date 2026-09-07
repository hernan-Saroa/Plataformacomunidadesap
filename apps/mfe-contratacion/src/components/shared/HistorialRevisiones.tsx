import React, { useState } from 'react';
import { Check, ChevronDown, Undo2 } from 'lucide-react';

import { RevisionDeActividad } from './usarAprobacion';
import { momento } from './fechas';

/**
 * El recorrido de la aprobación: cada vuelta que ha dado la actividad.
 *
 * Hasta ahora solo se veía la última decisión. Una actividad devuelta tres
 * veces mostraba la observación de la tercera, y las dos anteriores quedaban
 * en la base sin que nadie pudiera leerlas —ni el gestor que va a corregir, ni
 * el aprobador que quiere saber si ya pidió esto mismo antes.
 *
 * Va plegado porque lo habitual es no necesitarlo: la decisión vigente ya se
 * pinta arriba, y el historial es para cuando alguien se pregunta cómo se
 * llegó hasta aquí.
 */
export function HistorialRevisiones({
  revisiones,
  abiertoPorDefecto = false,
}: {
  revisiones: RevisionDeActividad[];
  /** En auditoría se abre solo: es a lo que va quien entra ahí. */
  abiertoPorDefecto?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto);

  // Sin vueltas no hay recorrido que contar.
  if (!revisiones.length) return null;

  const devoluciones = revisiones.filter((r) => r.decision === 'DEVUELTO').length;

  return (
    <div className="border-t border-gray-100 pt-2.5">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#003DA5] transition-colors"
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${abierto ? '' : '-rotate-90'}`}
          aria-hidden="true"
        />
        {/* Se dice cuántas devoluciones hubo, no solo cuántas decisiones: es el
            número que hace preguntarse qué pasó. */}
        {revisiones.length === 1
          ? 'Ver la decisión anterior'
          : `Ver el historial · ${revisiones.length} decisiones${
              devoluciones > 0
                ? `, ${devoluciones === 1 ? '1 devolución' : `${devoluciones} devoluciones`}`
                : ''
            }`}
      </button>

      {abierto ? (
        <ol className="m-0 mt-2.5 p-0 list-none space-y-2">
          {revisiones.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  r.decision === 'APROBADO' ? 'bg-emerald-100' : 'bg-amber-100'
                }`}
                aria-hidden="true"
              >
                {r.decision === 'APROBADO' ? (
                  <Check className="w-2.5 h-2.5 text-emerald-700" strokeWidth={3.5} />
                ) : (
                  <Undo2 className="w-2.5 h-2.5 text-amber-700" strokeWidth={3} />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-700 m-0 leading-snug">
                  {r.decision === 'APROBADO' ? 'Aprobada' : 'Devuelta'} por {r.revisadoPor}
                </p>
                <p className="text-[10.5px] text-slate-400 m-0 tabular-nums">
                  {momento(r.fecha)} · versión {r.versionRevisada}
                </p>
                {/* La observación completa, sin recortar: es lo que hubo que
                    corregir, y a medias no sirve para saber qué se pidió. */}
                {r.observaciones ? (
                  <p className="text-[11px] text-slate-600 m-0 mt-1 leading-relaxed break-words">
                    {r.observaciones}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
