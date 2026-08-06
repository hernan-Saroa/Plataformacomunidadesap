import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface EtapaProceso {
  numero: number;
  nombre: string;
  /** Etapas 1 y 2: fuera del alcance de la Fase 1. */
  fueraDeAlcance?: boolean;
}

/** Las 10 etapas del proceso contractual (matriz de flujo, anexo A2). */
export const ETAPAS: EtapaProceso[] = [
  { numero: 1, nombre: 'Identificación y Planeación', fueraDeAlcance: true },
  { numero: 2, nombre: 'Plan Anual de Adquisiciones', fueraDeAlcance: true },
  { numero: 3, nombre: 'Estudios Previos' },
  { numero: 4, nombre: 'CDP' },
  { numero: 5, nombre: 'Elaboración y Publicación' },
  { numero: 6, nombre: 'Recepción y Evaluación' },
  { numero: 7, nombre: 'Adjudicación' },
  { numero: 8, nombre: 'Perfeccionamiento y Legalización' },
  { numero: 9, nombre: 'Ejecución y Supervisión' },
  { numero: 10, nombre: 'Seguimiento y Liquidación' },
];

interface Props {
  etapaActual: number;
}

/**
 * Ubicación del proceso dentro de las 10 etapas.
 *
 * Se muestra resumido: de las diez etapas, dos están fuera de alcance y hoy
 * solo la tercera está implementada, así que la banda completa gastaba una
 * franja permanente para mostrar sobre todo estados futuros. El recorrido
 * entero sigue disponible, a un clic.
 *
 * Desplegado scrollea en horizontal en vez de encogerse, porque con 10 pasos
 * los nombres serían ilegibles.
 */
export function StepperEtapas({ etapaActual }: Props) {
  const [desplegado, setDesplegado] = useState(false);
  const actual = ETAPAS.find((e) => e.numero === etapaActual);

  return (
    <div>
      <button
        type="button"
        onClick={() => setDesplegado((v) => !v)}
        aria-expanded={desplegado}
        className="flex items-center gap-2 text-[11px] font-bold text-[#003DA5] hover:bg-[#E0EDFF]
          rounded-lg px-2 py-1 -ml-2 transition-colors"
      >
        <span className="tabular-nums">
          Etapa {etapaActual} de {ETAPAS.length}
        </span>
        {actual && <span className="text-gray-500 font-semibold">· {actual.nombre}</span>}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${desplegado ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {desplegado && <div className="mt-3">{recorrido(etapaActual)}</div>}
    </div>
  );
}

function recorrido(etapaActual: number) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <ol className="flex m-0 p-0 list-none" style={{ minWidth: 620 }}>
        {ETAPAS.map((etapa, idx) => {
          const completada = etapa.numero < etapaActual && !etapa.fueraDeAlcance;
          const actual = etapa.numero === etapaActual;
          const esUltima = idx === ETAPAS.length - 1;

          const color = actual ? '#003DA5' : completada ? '#10B981' : '#CBD5E1';

          return (
            <li
              key={etapa.numero}
              className="flex-1 flex flex-col items-center relative"
              style={{ minWidth: 58 }}
              title={`Etapa ${etapa.numero} · ${etapa.nombre}${
                etapa.fueraDeAlcance ? ' (fuera de la Fase 1)' : ''
              }`}
            >
              {/* Línea hacia la siguiente etapa */}
              {!esUltima && (
                <span
                  className="absolute h-[2px] top-[11px]"
                  style={{
                    left: '50%',
                    right: '-50%',
                    background: completada ? '#10B981' : '#E2E8F0',
                  }}
                  aria-hidden="true"
                />
              )}

              <span
                className="w-6 h-6 rounded-full flex items-center justify-center relative z-10 border-2 flex-shrink-0"
                style={{
                  background: completada || actual ? color : '#FFFFFF',
                  borderColor: color,
                  boxShadow: actual ? '0 0 0 4px #E0EDFF' : undefined,
                }}
              >
                {completada ? (
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                ) : (
                  <span
                    className="text-[10px] font-black tabular-nums leading-none"
                    style={{ color: actual ? '#FFFFFF' : '#94A3B8' }}
                  >
                    {etapa.numero}
                  </span>
                )}
              </span>

              <span
                className="text-[9.5px] font-bold text-center mt-2 leading-tight px-1"
                style={{ color: actual ? '#003DA5' : '#94A3B8' }}
              >
                {etapa.nombre}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
