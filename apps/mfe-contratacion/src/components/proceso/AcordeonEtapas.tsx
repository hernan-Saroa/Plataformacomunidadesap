import React, { ReactNode, useState } from 'react';
import { ChevronDown, Check, Lock } from 'lucide-react';
import { ActividadEtapa, ListaActividades } from './ListaActividades';

export interface EtapaConActividades {
  numero: number;
  nombre: string;
  actividades: ActividadEtapa[];
  /** Etapas 1 y 2: fuera del alcance de la Fase 1. */
  fueraDeAlcance?: boolean;
}

interface Props {
  etapas: EtapaConActividades[];
  etapaActual: number;
  expandida?: string | null;
  onAbrirActividad?: (numeral: string) => void;
  contenidoExpandido?: ReactNode;
}

/**
 * Etapas colapsables, cada una con sus actividades.
 *
 * Las 10 etapas suman 63 actividades; en una sola lista serían ~3.000px de
 * alto. El acordeón deja ver el progreso de todas y abrir solo la que se
 * está trabajando — mismo patrón que las etapas colapsables de Defensa
 * Judicial.
 */
export function AcordeonEtapas({
  etapas,
  etapaActual,
  expandida,
  onAbrirActividad,
  contenidoExpandido,
}: Props) {
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set([etapaActual]));

  const alternar = (numero: number) =>
    setAbiertas((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(numero)) siguiente.delete(numero);
      else siguiente.add(numero);
      return siguiente;
    });

  return (
    <div className="space-y-2">
      {etapas.map((etapa) => {
        const abierta = abiertas.has(etapa.numero);
        const aplicables = etapa.actividades.filter((a) => a.estado !== 'no_aplica');
        const completas = etapa.actividades.filter((a) => a.estado === 'aprobada').length;
        const esActual = etapa.numero === etapaActual;
        const completa = aplicables.length > 0 && completas === aplicables.length;

        const color = etapa.fueraDeAlcance
          ? '#94A3B8'
          : completa
            ? '#10B981'
            : esActual
              ? '#003DA5'
              : '#94A3B8';

        return (
          <div
            key={etapa.numero}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <button
              type="button"
              onClick={() => !etapa.fueraDeAlcance && alternar(etapa.numero)}
              disabled={etapa.fueraDeAlcance}
              aria-expanded={abierta}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                etapa.fueraDeAlcance ? 'cursor-not-allowed' : 'hover:bg-gray-50'
              } ${abierta ? 'border-b border-gray-200 bg-gray-50' : ''}`}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-black tabular-nums"
                style={{
                  background: esActual || completa ? color : `${color}18`,
                  color: esActual || completa ? '#FFFFFF' : color,
                }}
              >
                {completa ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : etapa.numero}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-black uppercase tracking-wider text-gray-400 leading-none">
                  Etapa {etapa.numero}
                </span>
                <span
                  className="block text-[13px] font-black leading-tight mt-0.5 truncate"
                  style={{ color: esActual ? '#003DA5' : '#374151' }}
                >
                  {etapa.nombre}
                </span>
              </span>

              {etapa.fueraDeAlcance ? (
                <span className="flex items-center gap-1.5 flex-shrink-0 text-[10px] font-bold text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                  Fuera de la Fase 1
                </span>
              ) : (
                <>
                  <span className="flex-shrink-0 text-[11px] font-bold text-gray-500 tabular-nums">
                    {completas} de {aplicables.length}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    style={{
                      transform: abierta ? 'none' : 'rotate(-90deg)',
                      transition: 'transform .2s',
                    }}
                  />
                </>
              )}
            </button>

            {abierta && !etapa.fueraDeAlcance && (
              <ListaActividades
                etapa={etapa.numero}
                nombreEtapa={etapa.nombre}
                actividades={etapa.actividades}
                onAbrir={onAbrirActividad}
                expandida={expandida}
                contenidoExpandido={contenidoExpandido}
                sinCabecera
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
