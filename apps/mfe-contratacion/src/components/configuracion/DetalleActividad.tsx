import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { ActividadAplicable, Modalidad } from '../../types';

import { CabeceraActividad } from './CabeceraActividad';

interface Props {
  actividad: ActividadAplicable;
  modalidad: string;
  modalidades: Modalidad[];
  onCambio: (cambios: Partial<ActividadAplicable>) => void;
}

/**
 * Lo que se configura de una actividad: su texto y en qué modalidades se exige.
 *
 * Antes esta pantalla también editaba las condiciones que valida cada
 * actividad —tipos de regla, operadores, excepciones por modalidad—, y eso no
 * es configuración: es lógica de negocio escrita en un formulario. Quien sabe
 * qué debe validarse no entra aquí, y quien entra no puede saberlo, así que las
 * reglas acababan viviendo en el código de todos modos con una pantalla
 * paralela que nadie mantenía.
 *
 * Queda lo que sí cambia sin desplegar y varía de verdad entre modalidades: si
 * la actividad se recorre, y el texto que lee el gestor.
 */
export function DetalleActividad({ actividad, modalidad, modalidades, onCambio }: Props) {
  return (
    <div className="space-y-4">
      <CabeceraActividad
        actividad={actividad}
        modalidad={modalidad}
        modalidades={modalidades}
        onCambio={onCambio}
      />

      {/* La salvedad es una nota de la matriz original que quedó sin resolver:
          se enseña porque condiciona lo que se decida aquí, pero no se edita —
          la aclara Contratación, no esta pantalla. */}
      {actividad.salvedad && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-900 m-0 leading-relaxed min-w-0">
            <strong className="font-bold">
              {actividad.variante
                ? `La matriz dice «${actividad.variante}». `
                : 'La matriz marcó esta celda con una condición. '}
            </strong>
            {actividad.salvedad}
          </p>
        </div>
      )}

      {/* Lo que se le pide al gestor se define al construir cada etapa, no
          aquí: decirlo evita buscar un configurador que ya no existe. */}
      <p className="text-[11px] text-gray-400 m-0 leading-relaxed">
        Lo que el gestor diligencia y las validaciones se definen en el desarrollo de la
        etapa, no desde esta pantalla.
      </p>
    </div>
  );
}
