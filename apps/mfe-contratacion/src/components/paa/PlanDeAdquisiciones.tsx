import React, { useState } from 'react';

import { CamposDelFormulario } from './CamposDelFormulario';
import { RegionesPaa } from './RegionesPaa';
import { VigenciasYVersiones } from './VigenciasYVersiones';

const SECCIONES = [
  { clave: 'versiones' as const, etiqueta: 'Documentos y versiones' },
  { clave: 'regiones' as const, etiqueta: 'Regiones' },
  { clave: 'campos' as const, etiqueta: 'Campos del formulario' },
];

type Seccion = (typeof SECCIONES)[number]['clave'];

/**
 * El Plan Anual de Adquisiciones del que nacen los procesos (migración 097).
 *
 * Vive en Configuración porque es un parámetro del flujo, como las tipologías:
 * se carga y se activa aquí, y gobierna los procesos que se creen después. Lo
 * que cada cambio les hace a los procesos ya creados se decide en la bandeja
 * Por revisar, no aquí.
 */
export function PlanDeAdquisiciones() {
  const [seccion, setSeccion] = useState<Seccion>('versiones');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-gray-200" role="tablist">
        {SECCIONES.map((s) => {
          const activa = seccion === s.clave;
          return (
            <button
              key={s.clave}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setSeccion(s.clave)}
              className={`px-3 py-2 text-xs font-bold border-b-2 pestana-paa ${
                activa ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.etiqueta}
            </button>
          );
        })}
      </div>

      {seccion === 'versiones' && <VigenciasYVersiones />}
      {seccion === 'regiones' && <RegionesPaa />}
      {seccion === 'campos' && <CamposDelFormulario />}
    </div>
  );
}
