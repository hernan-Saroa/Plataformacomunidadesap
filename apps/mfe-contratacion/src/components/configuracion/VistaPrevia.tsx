import React from 'react';
import { Calendar, Info, Search, Upload } from 'lucide-react';

import { ActividadAplicable, CampoConfigurable } from '../../types';

interface Props {
  actividad: ActividadAplicable;
  campos: CampoConfigurable[];
}

/**
 * Cómo queda la actividad para quien la diligencia.
 *
 * Se dibuja con los campos que ya están cargados, sin volver a preguntar al
 * servidor: así refleja lo que se acaba de configurar en la pestaña anterior y
 * no lo que había guardado al abrir el modal, que es justo la duda que trae a
 * mirar aquí.
 */
export function VistaPrevia({ actividad, campos }: Props) {
  const activos = campos.filter((c) => c.activo);
  const obligatorios = activos.filter((c) => c.obligatorio).length;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-gray-600 m-0 leading-relaxed">
          Así verá el gestor esta actividad. Se actualiza sola al cambiar lo que se pide.
          {activos.length > 0 && (
            <>
              {' '}
              <strong className="font-semibold text-gray-800">
                {activos.length} campo{activos.length === 1 ? '' : 's'}
              </strong>
              , {obligatorios} obligatorio{obligatorios === 1 ? '' : 's'}.
            </>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 m-0">
            Actividad {actividad.numeral}
          </p>
          <p className="text-sm font-bold text-gray-900 m-0 mt-0.5 leading-snug">
            {actividad.nombre}
          </p>
          {actividad.plazoDias && (
            <p className="text-[11px] text-gray-500 m-0 mt-1">
              Plazo: {actividad.plazoDias} día{actividad.plazoDias === 1 ? '' : 's'} hábil
              {actividad.plazoDias === 1 ? '' : 'es'}
            </p>
          )}
        </div>

        <div className="p-4 space-y-4">
          {actividad.descripcion && (
            <p className="text-xs text-gray-600 m-0 leading-relaxed">{actividad.descripcion}</p>
          )}

          {activos.length === 0 ? (
            <p className="text-xs text-gray-500 m-0 py-2">
              No se le pide nada: el gestor solo marca la actividad como terminada.
            </p>
          ) : (
            activos.map((campo) => <Campo key={campo.id} campo={campo} />)
          )}

          <button
            type="button"
            disabled
            className="rounded-lg bg-[#003DA5] px-3 py-1.5 text-xs font-semibold text-white cursor-default"
          >
            Terminar actividad
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Un campo del formulario, dibujado según lo que se le pide al gestor.
 *
 * Los campos que nombran a un funcionario se dibujan con el buscador de
 * personas aunque estén guardados como texto: así los creó el estudio previo
 * antes de que existiera el tipo `responsable`, y pintarlos como una caja vacía
 * enseñaría algo distinto de lo que el gestor se encuentra.
 */
function Campo({ campo }: { campo: CampoConfigurable }) {
  const buscaPersona =
    campo.tipo === 'responsable' ||
    /responsable|supervisor|interventor/.test(campo.codigo);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-800 m-0 mb-1">
        {campo.etiqueta}
        {campo.obligatorio && <span className="text-red-500 ml-1">*</span>}
      </p>
      {campo.ayuda && <p className="text-[11px] text-gray-500 m-0 mb-1">{campo.ayuda}</p>}

      {campo.tipo === 'texto_largo' && (
        <div className="rounded-lg border border-gray-300 bg-white px-3 py-2 h-14">
          <span className="text-xs text-gray-400">Escribe aquí…</span>
        </div>
      )}

      {!buscaPersona &&
        (campo.tipo === 'texto' || campo.tipo === 'numero' || campo.tipo === 'moneda') && (
          <div className="rounded-lg border border-gray-300 bg-white px-3 py-1.5">
            <span className="text-xs text-gray-400">
              {campo.tipo === 'moneda' ? '$ 0' : campo.tipo === 'numero' ? '0' : '—'}
            </span>
          </div>
        )}

      {campo.tipo === 'seleccion' && (
        <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-1.5">
          <span className="text-xs text-gray-400">Elegir…</span>
          <span className="text-[10px] text-gray-400">▾</span>
        </div>
      )}

      {campo.tipo === 'fecha' && (
        <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-1.5">
          <span className="text-xs text-gray-400">DD/MM/AAAA</span>
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
        </div>
      )}

      {campo.tipo === 'casilla' && (
        <label className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded border border-gray-400 bg-white flex-shrink-0" />
          <span className="text-xs text-gray-600">{campo.etiqueta}</span>
        </label>
      )}

      {campo.tipo === 'archivo' && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
          <Upload className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">Adjuntar archivo</span>
        </div>
      )}

      {/* La persona se busca con el mismo selector que el resto del módulo:
          quién responde lo elige el gestor aquí, no la configuración, porque
          cambia en cada proceso. */}
      {buscaPersona && (
        <div className="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-1.5">
          <span className="text-xs text-gray-400">Busca por nombre…</span>
          <Search className="w-3.5 h-3.5 text-gray-400" />
        </div>
      )}
    </div>
  );
}
