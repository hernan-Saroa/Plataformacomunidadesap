import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { ActividadAplicable } from '../../types';
import { EstadoActividad, IconoEstado, estadoDe } from './estados';

/** El módulo arranca en la etapa 3: es donde empieza el trabajo en el sistema. */
export const ETAPA_INICIAL = 3;

const NOMBRE_ETAPA: Record<number, string> = {
  1: 'Identificación y planeación',
  2: 'Plan Anual de Adquisiciones',
  3: 'Estudios previos',
  4: 'CDP',
  5: 'Elaboración y publicación',
  6: 'Evaluación',
  7: 'Adjudicación',
  8: 'Suscripción',
  9: 'Ejecución',
  10: 'Liquidación',
};

interface Props {
  actividades: ActividadAplicable[];
  seleccion: string | null;
  onSeleccionar: (numeral: string) => void;
  cargando?: boolean;
}

/**
 * Árbol de etapas y actividades.
 *
 * Colapsable porque la matriz tiene 63 actividades repartidas en 10 etapas:
 * con todo abierto hay que recorrer la pantalla entera para llegar al final.
 * Arranca con la etapa 3 desplegada y las demás plegadas, mostrando en el
 * encabezado cuántas actividades de cada una están resueltas.
 */
export function ArbolActividades({
  actividades,
  seleccion,
  onSeleccionar,
  cargando,
}: Props) {
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set([ETAPA_INICIAL]));

  const porEtapa = useMemo(() => {
    const mapa = new Map<number, ActividadAplicable[]>();
    for (const a of actividades) {
      if (!mapa.has(a.etapa)) mapa.set(a.etapa, []);
      mapa.get(a.etapa)!.push(a);
    }
    return [...mapa.entries()].sort(([a], [b]) => a - b);
  }, [actividades]);

  const alternar = (etapa: number) =>
    setAbiertas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(etapa)) siguiente.delete(etapa);
      else siguiente.add(etapa);
      return siguiente;
    });

  if (cargando) {
    return (
      <div className="p-4 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      {porEtapa.map(([etapa, lista]) => {
        const abierta = abiertas.has(etapa);
        const resumen = contar(lista);

        return (
          <div key={etapa}>
            <button
              type="button"
              onClick={() => alternar(etapa)}
              aria-expanded={abierta}
              className="w-full flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/80 hover:bg-gray-100 text-left"
            >
              {abierta ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Etapa {etapa}
                </span>
                <span className="block text-xs text-gray-700 truncate">
                  {NOMBRE_ETAPA[etapa] ?? ''}
                </span>
              </span>
              {/* El resumen se ve con la etapa plegada: es lo que dice si vale
                  la pena abrirla. */}
              <span className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-semibold">
                {resumen.configuradas > 0 && (
                  <span className="text-emerald-700">✓{resumen.configuradas}</span>
                )}
                {resumen.pendientes > 0 && (
                  <span className="text-amber-700">⚠{resumen.pendientes}</span>
                )}
                {resumen.noAplica > 0 && (
                  <span className="text-gray-400">⊘{resumen.noAplica}</span>
                )}
              </span>
            </button>

            {abierta &&
              lista.map((a) => {
                const estado = estadoDe(a);
                return (
                  <button
                    key={a.numeral}
                    type="button"
                    onClick={() => onSeleccionar(a.numeral)}
                    className={`w-full flex items-start gap-2.5 pl-8 pr-3 py-2 text-left border-b border-gray-100 transition-colors ${
                      seleccion === a.numeral ? 'bg-[#E0EDFF]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="mt-0.5 flex-shrink-0">
                      <IconoEstado estado={estado} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-gray-500">{a.numeral}</span>
                        {(a.reglas ?? 0) > 0 && (
                          <span className="rounded bg-gray-100 px-1 text-[10px] font-semibold text-gray-600">
                            {a.reglas} regla{a.reglas === 1 ? '' : 's'}
                          </span>
                        )}
                        {(a.reglasPropias ?? 0) > 0 && (
                          <span
                            title="Tiene reglas propias de esta modalidad"
                            className="rounded bg-[#E0EDFF] px-1 text-[10px] font-semibold text-[#003DA5]"
                          >
                            excepción
                          </span>
                        )}
                      </span>
                      <span
                        className={`block text-sm leading-snug ${
                          estado === EstadoActividad.NoAplica
                            ? 'text-gray-400 line-through'
                            : 'text-gray-800'
                        }`}
                      >
                        {a.nombre}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

function contar(lista: ActividadAplicable[]) {
  let configuradas = 0;
  let pendientes = 0;
  let noAplica = 0;

  for (const a of lista) {
    const estado = estadoDe(a);
    if (estado === EstadoActividad.NoAplica) noAplica++;
    else if (estado === EstadoActividad.Configurada || estado === EstadoActividad.ConExcepciones) {
      configuradas++;
    } else pendientes++;
  }

  return { configuradas, pendientes, noAplica };
}
