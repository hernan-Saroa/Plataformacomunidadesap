import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CampoFaltante } from '../../types';

interface Props {
  faltantes: CampoFaltante[];
  onIrACampo: (codigo: string) => void;
}

/**
 * Criterio 2 del HU: cuando el envío se bloquea, el sistema debe señalar
 * cuáles campos faltan. Cada uno es un enlace que lleva al campo.
 */
export function AlertaCamposFaltantes({ faltantes, onIrACampo }: Props) {
  if (faltantes.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-5 rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3.5"
    >
      <h4 className="flex items-center gap-2 text-sm font-extrabold text-red-700 m-0">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        {faltantes.length === 1
          ? 'Falta 1 campo obligatorio'
          : `Faltan ${faltantes.length} campos obligatorios`}
      </h4>
      <p className="mt-1 mb-2 text-xs text-slate-600">
        No se puede enviar a revisión hasta completarlos.
      </p>
      <ul className="m-0 pl-4 text-xs columns-1 sm:columns-2 gap-6">
        {faltantes.map((campo) => (
          <li key={campo.codigo} className="mb-1">
            <button
              type="button"
              onClick={() => onIrACampo(campo.codigo)}
              className="text-red-700 font-semibold underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
            >
              {campo.etiqueta}
            </button>
            {campo.grupo && <span className="text-slate-500"> · {campo.grupo}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
