import React, { useMemo } from 'react';
import { FileText, ArrowRight } from 'lucide-react';

import { ProcesoResumen } from '../../types';
import { ETAPAS } from '../proceso/Etapas';

interface EstadoVisual {
  texto: string;
  clase: string;
  icono: React.ReactNode;
}

interface Props {
  procesos: ProcesoResumen[];
  /** Se reutiliza el mismo cálculo de estado que la lista, para no divergir. */
  estadoDe: (proceso: ProcesoResumen) => EstadoVisual;
  onAbrir: (procesoId: string) => void;
}

/**
 * Tablero de procesos por etapa: una columna por etapa del flujo contractual y
 * una tarjeta por proceso, ubicada en la etapa donde va.
 *
 * Es el mismo patrón que los tableros de Control Interno, Gestión Legal y
 * Control Disciplinario: sirve para ver dónde se está represando la
 * contratación, algo que la lista plana no muestra.
 *
 * Las etapas 1 y 2 quedan fuera: el propio catálogo las marca fuera de alcance
 * y los procesos nacen en la 3. Se muestran solo si algún proceso cayera ahí,
 * para que ninguno quede invisible.
 */
export function TableroProcesos({ procesos, estadoDe, onAbrir }: Props) {
  const columnas = useMemo(() => {
    const porEtapa = new Map<number, ProcesoResumen[]>();
    for (const proceso of procesos) {
      const lista = porEtapa.get(proceso.etapa) ?? [];
      lista.push(proceso);
      porEtapa.set(proceso.etapa, lista);
    }

    return ETAPAS.filter((etapa) => !etapa.fueraDeAlcance || porEtapa.has(etapa.numero)).map(
      (etapa) => ({ etapa, procesos: porEtapa.get(etapa.numero) ?? [] }),
    );
  }, [procesos]);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 items-start" style={{ minWidth: 'min-content' }}>
        {columnas.map(({ etapa, procesos: enEtapa }) => {
          const vacia = enEtapa.length === 0;

          return (
            <section
              key={etapa.numero}
              aria-label={`Etapa ${etapa.numero}: ${etapa.nombre}`}
              className={`columna-tablero flex flex-col rounded-xl border ${
                vacia ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'
              }`}
            >
              <header className="px-3 py-2.5 border-b border-gray-200 flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-md grid place-items-center text-[10px] font-black tabular-nums flex-shrink-0 ${
                    vacia ? 'bg-gray-200 text-gray-500' : 'bg-[#E0EDFF] text-[#003DA5]'
                  }`}
                >
                  {etapa.numero}
                </span>
                <h3
                  className={`text-[11px] font-black uppercase tracking-wide m-0 leading-tight flex-1 min-w-0 ${
                    vacia ? 'text-gray-400' : 'text-slate-700'
                  }`}
                >
                  {etapa.nombre}
                </h3>
                <span
                  className={`text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    vacia ? 'text-gray-400' : 'bg-[#003DA5] text-white'
                  }`}
                >
                  {enEtapa.length}
                </span>
              </header>

              <div className="p-2 flex flex-col gap-2 min-h-[72px]">
                {vacia ? (
                  <p className="text-[11px] text-gray-400 m-0 px-1 py-3 text-center">
                    Sin procesos
                  </p>
                ) : (
                  enEtapa.map((proceso) => {
                    const estado = estadoDe(proceso);
                    return (
                      <button
                        key={proceso.id}
                        type="button"
                        onClick={() => onAbrir(proceso.id)}
                        className="group text-left w-full rounded-lg border border-gray-200 bg-white p-2.5
                          hover:border-[#003DA5]/40 hover:shadow-sm focus:outline-none
                          focus:ring-2 focus:ring-[#003DA5]/30 transition-all"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="w-3.5 h-3.5 text-[#003DA5] flex-shrink-0" />
                          <span className="text-[11px] font-black text-[#003DA5] tabular-nums truncate">
                            {proceso.radicado}
                          </span>
                          <ArrowRight
                            className="w-3 h-3 text-gray-300 group-hover:text-[#003DA5] ml-auto flex-shrink-0"
                            aria-hidden="true"
                          />
                        </div>

                        {/* Dos líneas: en una tarjeta estrecha, el objeto completo
                            empujaría el estado fuera de vista. */}
                        <p
                          className="text-[12px] text-slate-700 m-0 leading-snug mb-2"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {proceso.objeto}
                        </p>

                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${estado.clase}`}
                        >
                          {estado.icono}
                          {estado.texto}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
