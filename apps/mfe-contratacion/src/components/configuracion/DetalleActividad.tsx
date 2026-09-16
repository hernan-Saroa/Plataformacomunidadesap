import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { ActividadAplicable, CampoConfigurable, Modalidad } from '../../types';

import { CabeceraActividad } from './CabeceraActividad';
import { FormatosActividad } from './FormatosActividad';
import { AprobacionActividad } from './AprobacionActividad';
import { QueSePide } from './QueSePide';
import { VistaPrevia } from './VistaPrevia';
import { Peticion } from './peticiones';

type Pestana = 'configurar' | 'aprobacion' | 'formatos' | 'previa';

/**
 * Nota sobre los formatos: aquí solo se ven los que ya están asignados a la
 * actividad. Subirlos se hace en la biblioteca, porque un mismo formato sirve
 * en varias actividades y subirlo en cada una multiplicaría copias del mismo
 * archivo.
 */

interface Props {
  actividad: ActividadAplicable;
  modalidad: string;
  modalidades: Modalidad[];
  campos: CampoConfigurable[];
  cargandoCampos: boolean;
  onCambio: (cambios: Partial<ActividadAplicable>) => void;
  onAgregarCampo: (peticion: Peticion) => Promise<void>;
  onRenombrarCampo: (campo: CampoConfigurable, etiqueta: string) => Promise<void>;
  onExigirCampo: (campo: CampoConfigurable, obligatorio: boolean) => Promise<void>;
  onQuitarCampo: (campo: CampoConfigurable) => Promise<void>;
}

/**
 * Lo que se configura de una actividad.
 *
 * Dos pestañas: lo que se ajusta, y cómo queda para el gestor. La vista previa
 * se dibuja con lo que hay en pantalla, así que responde la pregunta que trae a
 * mirarla —«¿cómo se verá esto?»— sin cerrar y volver a abrir.
 */
export function DetalleActividad({
  actividad,
  modalidad,
  modalidades,
  campos,
  cargandoCampos,
  onCambio,
  onAgregarCampo,
  onRenombrarCampo,
  onExigirCampo,
  onQuitarCampo,
}: Props) {
  const [pestana, setPestana] = useState<Pestana>('configurar');

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

      {/* Solo cuando la actividad se recorre: configurar qué pide algo que la
          modalidad se salta es trabajo que nadie llegará a ver. */}
      {actividad.aplica && (
        <>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {(
              [
                ['configurar', 'Qué se pide'],
                ['aprobacion', 'Aprobación'],
                ['formatos', 'Formatos'],
                ['previa', 'Cómo lo verá el gestor'],
              ] as [Pestana, string][]
            ).map(([id, texto]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPestana(id)}
                aria-current={pestana === id}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  pestana === id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          {pestana === 'configurar' && (
            <QueSePide
              numeral={actividad.numeral}
              campos={campos}
              cargando={cargandoCampos}
              onAgregar={onAgregarCampo}
              onRenombrar={onRenombrarCampo}
              onExigir={onExigirCampo}
              onQuitar={onQuitarCampo}
            />
          )}

          {pestana === 'aprobacion' && <AprobacionActividad numeral={actividad.numeral} />}

          {pestana === 'formatos' && (
            <FormatosActividad
              numeral={actividad.numeral}
              modalidad={modalidad}
              modalidades={modalidades}
            />
          )}

          {pestana === 'previa' && <VistaPrevia actividad={actividad} campos={campos} />}
        </>
      )}
    </div>
  );
}
