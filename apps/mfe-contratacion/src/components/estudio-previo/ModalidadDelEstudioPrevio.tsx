import React from 'react';
import { Scale } from 'lucide-react';

import { EstudioPrevio } from '../../types';

interface Props {
  proceso: EstudioPrevio['proceso'];
}

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * La modalidad de contratación dentro del estudio previo, junto al valor que
 * la determina.
 *
 * Antes la modalidad era la 3.5, y llegaba tarde: la lista de documentos de la
 * 3.1 depende de ella (migración 094). Como el objeto y el valor (migración
 * 105), ya no se cambia aquí: sale de la línea del PAA y solo cambia con una
 * versión nueva del PAA. Aprobar el estudio previo es ratificarla, y si no
 * corresponde, el abogado lo devuelve.
 */
export function ModalidadDelEstudioPrevio({ proceso }: Props) {
  const valorActual = typeof proceso.valorEstimado === 'number' ? proceso.valorEstimado : null;

  return (
    <section
      aria-label="Modalidad de contratación"
      className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3"
    >
      <div className="flex items-start gap-2.5">
        <Scale className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500 m-0">
            Modalidad de contratación
          </p>
          <p className="text-[13px] font-bold text-slate-800 m-0 mt-0.5 break-words">
            {proceso.modalidadNombre ?? 'Sin modalidad'}
          </p>
          {/* La cuantía junto a la modalidad: de ella depende cuál corresponde. */}
          {valorActual !== null && (
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 tabular-nums">
              Valor estimado {formatoPesos.format(valorActual)} · según el PAA
            </p>
          )}
          <p className="text-[11px] text-slate-500 m-0 mt-1 leading-relaxed">
            Viene del PAA y de ella depende la lista de documentos. Se ratifica al aprobar el
            estudio previo; si no corresponde, se devuelve diciendo cuál.
          </p>
        </div>
        {puedeCambiar && !cambiando && (
          <button
            type="button"
            onClick={abrir}
            className="shrink-0 text-[11.5px] font-bold text-[#003DA5] hover:underline"
          >
            Cambiar
          </button>
        )}
      </div>
    </section>
  );
}
