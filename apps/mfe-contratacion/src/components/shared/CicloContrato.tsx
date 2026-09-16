import React from 'react';
import { Check, PauseCircle } from 'lucide-react';

/**
 * El ciclo del contrato de EFDS-1184, en una tira.
 *
 * La recta va de la minuta al cierre; SUSPENDIDO no es un paso más sino una
 * pausa sobre la ejecución, así que se muestra como insignia sobre ese punto y
 * no como estación propia — igual que en el modelo del backend.
 */
const PASOS = [
  ['GENERADO', 'Generado'],
  ['ACEPTADO', 'Aceptado'],
  ['PERFECCIONADO', 'Perfeccionado'],
  ['LEGALIZADO', 'Legalizado'],
  ['EJECUCION', 'Ejecución'],
  ['TERMINADO', 'Terminado'],
  ['LIQUIDADO', 'Liquidado'],
  ['CERRADO', 'Cerrado'],
] as const;

export function CicloContrato({ estado }: { estado: string }) {
  const suspendido = estado === 'SUSPENDIDO';
  // Suspendido está parado sobre la ejecución: el camino recorrido es el mismo.
  const efectivo = suspendido ? 'EJECUCION' : estado;
  const indice = PASOS.findIndex(([codigo]) => codigo === efectivo);

  if (estado === 'RECHAZADO') {
    return (
      <p className="text-[11px] font-bold text-red-700 m-0">
        Minuta rechazada — no prosperó; la entidad genera otra
      </p>
    );
  }

  return (
    <ol className="m-0 p-0 list-none flex items-center gap-0 overflow-x-auto" aria-label="Ciclo del contrato">
      {PASOS.map(([codigo, nombre], i) => {
        const pasado = i < indice;
        const actual = i === indice;
        return (
          <li key={codigo} className="flex items-center flex-shrink-0">
            {i > 0 && (
              <span
                className={`block w-4 h-[2px] ${pasado || actual ? 'bg-[#003DA5]' : 'bg-gray-200'}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                actual
                  ? suspendido
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-[#E0EDFF] text-[#003DA5] border border-[#003DA5]/30'
                  : pasado
                    ? 'text-slate-500'
                    : 'text-slate-300'
              }`}
              aria-current={actual ? 'step' : undefined}
            >
              {pasado && <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />}
              {actual && suspendido && (
                <PauseCircle className="w-3 h-3" aria-hidden="true" />
              )}
              {actual && suspendido ? `${nombre} · Suspendido` : nombre}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
