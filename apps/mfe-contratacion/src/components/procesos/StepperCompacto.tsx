import React from 'react';
import { ETAPAS } from '../proceso/StepperEtapas';

interface Props {
  etapaActual: number;
}

/**
 * Versión reducida del stepper para las filas del listado: solo los puntos,
 * sin nombres. Deja ver de un vistazo en qué etapa va cada proceso sin
 * ocupar el alto que exige el stepper completo del detalle.
 */
export function StepperCompacto({ etapaActual }: Props) {
  return (
    <div className="flex items-center" title={`Etapa ${etapaActual} de 10`}>
      {ETAPAS.map((etapa, idx) => {
        const completada = etapa.numero < etapaActual && !etapa.fueraDeAlcance;
        const actual = etapa.numero === etapaActual;
        const esUltima = idx === ETAPAS.length - 1;
        const color = actual ? '#003DA5' : completada ? '#10B981' : '#D8DEE9';

        return (
          <React.Fragment key={etapa.numero}>
            <span
              className="rounded-full flex-shrink-0"
              style={{
                width: actual ? 9 : 7,
                height: actual ? 9 : 7,
                background: color,
                boxShadow: actual ? '0 0 0 2.5px #E0EDFF' : undefined,
              }}
              title={`Etapa ${etapa.numero} · ${etapa.nombre}`}
            />
            {!esUltima && (
              <span
                className="flex-shrink-0"
                style={{
                  width: 14,
                  height: 2,
                  background: completada ? '#10B981' : '#E8EDF3',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
