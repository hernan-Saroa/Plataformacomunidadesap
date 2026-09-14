import React from 'react';
import { Check } from 'lucide-react';

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

/** Cuántas actividades de la etapa aplican a la modalidad y cuántas están hechas. */
export interface AvanceEtapa {
  aplicables: number;
  completas: number;
}

interface Props {
  /** Dónde está el proceso según su estado. */
  etapaActual: number;
  /** Qué etapa se está mirando, que no siempre es la actual. */
  etapaSeleccionada: number;
  onSeleccionar: (etapa: number) => void;
  avance: Record<number, AvanceEtapa>;
}

const AZUL = '#003DA5';
const VERDE = '#10B981';
const GRIS = '#CBD5E1';

/**
 * Línea del tiempo de las diez etapas, y navegación entre ellas.
 *
 * Antes era un resumen plegado que solo decía dónde estaba el proceso, y el
 * recorrido de las diez etapas vivía en el carril de la izquierda. Ahora manda
 * aquí: se elige la etapa arriba y el carril muestra únicamente sus
 * actividades. El carril crecía sin techo —tres etapas al principio, diez al
 * final— y llegó a pedir bajar por nueve etapas para trabajar en una.
 *
 * **«Hecha» se deriva de las actividades, no de `procesos.etapa`.** Ese número
 * no se mueve de forma fiable —sigue en 5 después de la apertura, y ninguna
 * historia dice cuándo pasa a 6—, así que usarlo para pintar el recorrido
 * mentiría. Una etapa está hecha cuando todas las que aplican a la modalidad
 * están aprobadas.
 */
export function LineaDeTiempoEtapas({
  etapaActual,
  etapaSeleccionada,
  onSeleccionar,
  avance,
}: Props) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <ol className="flex m-0 p-0 list-none" style={{ minWidth: 620 }}>
        {ETAPAS.map((etapa, idx) => {
          const suyo = avance[etapa.numero];
          const completa = !!suyo && suyo.aplicables > 0 && suyo.completas === suyo.aplicables;
          const seleccionada = etapa.numero === etapaSeleccionada;
          const esActual = etapa.numero === etapaActual;
          const esUltima = idx === ETAPAS.length - 1;

          // Las etapas 1 y 2 no se navegan: no están en la Fase 1 y no tienen
          // actividades que mostrar. Se dibujan para que el recorrido sea el
          // del proceso real y no el del alcance del proyecto.
          const navegable = !etapa.fueraDeAlcance;

          const color = completa ? VERDE : seleccionada || esActual ? AZUL : GRIS;

          return (
            <li
              key={etapa.numero}
              className="flex-1 flex flex-col items-center relative"
              style={{ minWidth: 58 }}
            >
              {/* Línea hacia la siguiente etapa */}
              {!esUltima && (
                <span
                  className="absolute"
                  style={{
                    // Alto y posicion en linea y no en clases: `h-[2px]` y
                    // `top-[15px]` no estan en el CSS compilado del shell y se
                    // descartaban sin avisar, dejando el conector invisible.
                    height: 2,
                    top: 15,
                    left: '50%',
                    right: '-50%',
                    background: completa ? VERDE : '#E2E8F0',
                  }}
                  aria-hidden="true"
                />
              )}

              <button
                type="button"
                disabled={!navegable}
                onClick={() => onSeleccionar(etapa.numero)}
                aria-current={seleccionada ? 'step' : undefined}
                title={
                  navegable
                    ? `Etapa ${etapa.numero} · ${etapa.nombre}`
                    : `Etapa ${etapa.numero} · ${etapa.nombre} (fuera de la Fase 1)`
                }
                className={`flex flex-col items-center rounded-lg px-1 py-1 w-full
                  transition-colors focus:outline-none focus-visible:ring-2
                  focus-visible:ring-[#003DA5]/40 ${
                    navegable ? 'hover:bg-slate-50' : 'cursor-not-allowed'
                  }`}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center relative z-10
                    border-2 flex-shrink-0"
                  style={{
                    background: completa || seleccionada ? color : '#FFFFFF',
                    borderColor: color,
                    boxShadow: seleccionada ? '0 0 0 4px #E0EDFF' : undefined,
                  }}
                >
                  {completa ? (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  ) : (
                    <span
                      className="text-[10px] font-black tabular-nums leading-none"
                      style={{ color: seleccionada ? '#FFFFFF' : esActual ? AZUL : '#94A3B8' }}
                    >
                      {etapa.numero}
                    </span>
                  )}
                </span>

                <span
                  className="text-[9px] font-bold text-center mt-2 leading-tight px-1"
                  style={{ color: seleccionada ? AZUL : '#94A3B8' }}
                >
                  {etapa.nombre}
                </span>

                {/* El contador solo donde hay algo que contar: en las etapas sin
                    actividades cargadas un "0/0" se leería como atraso. */}
                {suyo && suyo.aplicables > 0 && (
                  <span
                    className="text-[9px] font-black tabular-nums leading-none mt-1"
                    style={{ color: completa ? VERDE : '#94A3B8' }}
                  >
                    {suyo.completas}/{suyo.aplicables}
                  </span>
                )}

                {/* Dónde está el proceso, para no perderlo al mirar otra etapa. */}
                {esActual && (
                  <span
                    className="text-[9px] font-black uppercase tracking-wider leading-none mt-1"
                    style={{ color: AZUL }}
                  >
                    Actual
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
