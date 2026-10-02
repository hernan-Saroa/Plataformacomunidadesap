import React from 'react';
import { Timer } from 'lucide-react';

import { PlazoDeActividad } from '../../types';

/** «vence hoy», «vence en 3 días hábiles», «venció hace 2 días hábiles». */
export function textoDelPlazo(plazo: PlazoDeActividad): string {
  const dias = Math.abs(plazo.restantes);
  const habiles = dias === 1 ? '1 día hábil' : `${dias} días hábiles`;
  if (plazo.restantes < 0) return `venció hace ${habiles}`;
  if (plazo.restantes === 0) return 'vence hoy';
  return `vence en ${habiles}`;
}

/**
 * El semáforo del plazo de una actividad.
 *
 * El tablero disciplinario lo pone en cada tarjeta y es lo primero que se lee:
 * dice qué atender antes sin abrir nada. Solo aparece cuando aprieta —el
 * servicio no devuelve lo que va holgado—, así que un proceso sin chip está en
 * término.
 */
export function ChipPlazo({
  plazo,
  conNombre = false,
}: {
  plazo: PlazoDeActividad;
  /** En la ficha del proceso se nombra la actividad; en una fila basta el numeral. */
  conNombre?: boolean;
}) {
  const vencido = plazo.estado === 'VENCIDO';
  return (
    <span
      title={`${plazo.numeral} · ${plazo.nombre} · ${textoDelPlazo(plazo)}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11.5px] font-bold ${
        vencido ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      <Timer className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      {plazo.numeral}
      {conNombre ? ` · ${plazo.nombre}` : ''} · {textoDelPlazo(plazo)}
    </span>
  );
}
