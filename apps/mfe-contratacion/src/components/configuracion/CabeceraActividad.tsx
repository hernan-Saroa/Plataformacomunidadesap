import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ActividadAplicable, Modalidad } from '../../types';

interface Props {
  actividad: ActividadAplicable;
  modalidad: string;
  modalidades: Modalidad[];
  onCambio: (cambios: Partial<ActividadAplicable>) => void;
}

/**
 * Encabezado de la actividad: su texto y si aplica a la modalidad elegida.
 *
 * El nombre y la descripción salían del seed y solo se corregían por SQL, así
 * que una errata obligaba a un despliegue.
 */
export function CabeceraActividad({ actividad, modalidad, modalidades, onCambio }: Props) {
  const nombreModalidad =
    modalidades.find((m) => m.codigo === modalidad)?.nombre ?? modalidad;
  const [nombre, setNombre] = useState(actividad.nombre);
  const [descripcion, setDescripcion] = useState(actividad.descripcion ?? '');
  const [excluyendo, setExcluyendo] = useState(false);
  const [motivo, setMotivo] = useState('');

  // Abrir otra celda reutiliza este componente, así que los borradores tienen
  // que seguir a la actividad: sin esto, el texto de la anterior se quedaría
  // escrito encima de la nueva.
  useEffect(() => {
    setNombre(actividad.nombre);
    setDescripcion(actividad.descripcion ?? '');
    setExcluyendo(false);
    setMotivo('');
  }, [actividad.numeral, actividad.nombre, actividad.descripcion]);

  /**
   * Guarda al salir del campo, y solo si algo cambió.
   *
   * Sin la comparación, pasar por los campos con el tabulador dispararía una
   * petición y un aviso de guardado por cada uno.
   */
  const guardar = async () => {
    const limpio = nombre.trim();
    const desc = descripcion.trim();
    if (!limpio) {
      setNombre(actividad.nombre);
      return;
    }
    if (limpio === actividad.nombre && desc === (actividad.descripcion ?? '')) return;

    try {
      await contratacionService.actualizarActividad(actividad.numeral, {
        nombre: limpio,
        descripcion: desc || undefined,
      });
      onCambio({ nombre: limpio, descripcion: desc || null });
      toast.success('Texto actualizado');
    } catch (err: any) {
      setNombre(actividad.nombre);
      setDescripcion(actividad.descripcion ?? '');
      toast.error(err.message ?? 'No se pudo guardar');
    }
  };

  const cambiarAplicabilidad = async (aplica: boolean, razon?: string) => {
    try {
      await contratacionService.cambiarAplicabilidad(actividad.numeral, {
        modalidad,
        aplica,
        motivo: razon,
      });
      onCambio({ aplica, motivo: razon ?? null });
      setExcluyendo(false);
      setMotivo('');
      toast.success(aplica ? 'La actividad ahora aplica' : 'Actividad marcada como no aplica');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cambiar');
    }
  };

  return (
    <>
      {/* El numeral, el nombre y la modalidad ya los dice la cabecera del
          modal, así que aquí solo va lo que añade algo: la descripción, en qué
          punto está y si se exige en esta modalidad. Repetirlos empujaba el
          contenido real media pantalla hacia abajo. */}
      {/* Sin marco propio: el modal ya encuadra el contenido, y una caja
          dentro de otra caja con el mismo borde parecía una sección aparte de
          algo que no la tiene. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        {/* Los textos se escriben directamente: no hay botón «Editar» ni modo
            de edición porque son dos campos y siempre se pueden cambiar, así
            que pedir un clic previo solo añadía un paso antes de escribir. Se
            guardan al salir del campo, que es cuando se ha terminado. */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={guardar}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                setNombre(actividad.nombre);
                e.currentTarget.blur();
              }
            }}
            maxLength={200}
            aria-label="Nombre de la actividad"
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-gray-900 transition-colors hover:border-gray-300 hover:bg-white focus:border-[#003DA5] focus:bg-white focus:ring-1 focus:ring-[#003DA5] outline-none"
          />
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onBlur={guardar}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDescripcion(actividad.descripcion ?? '');
                e.currentTarget.blur();
              }
            }}
            rows={2}
            placeholder="Sin descripción. Escribe aquí lo que el gestor debe saber."
            aria-label="Descripción de la actividad"
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs leading-relaxed text-gray-600 transition-colors hover:border-gray-300 hover:bg-white focus:border-[#003DA5] focus:bg-white focus:ring-1 focus:ring-[#003DA5] outline-none resize-none"
          />
          {!actividad.aplica && actividad.motivo && (
            <p className="text-[11px] text-gray-500 m-0 px-2">{actividad.motivo}</p>
          )}
        </div>

        {/* La aplicabilidad se plantea como pregunta con un interruptor:
            «No exigir aquí» obligaba a deducir el estado actual del texto del
            botón, que enuncia la acción contraria a la que está en vigor. */}
        <button
          type="button"
          role="switch"
          aria-checked={actividad.aplica}
          onClick={() => (actividad.aplica ? setExcluyendo(true) : cambiarAplicabilidad(true))}
          title={
            actividad.aplica
              ? `El gestor debe completarla en ${nombreModalidad}`
              : `No se exige en ${nombreModalidad}`
          }
          className={`flex-shrink-0 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
            actividad.aplica
              ? 'border-[#003DA5]/30 bg-[#E0EDFF]/50 hover:bg-[#E0EDFF]'
              : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-gray-700">Obligatoria aquí</span>
          {/* Apagado se dibuja con contorno y no en gris plano: un interruptor
              apagado sin marco parece deshabilitado, y aquí es un estado tan
              válido como el encendido. */}
          {/* Medidas y desplazamiento con utilidades estándar: las clases de
              valor arbitrario —`w-[15px]`, `left-[19px]`— no llegan a la hoja
              compilada que sirve el remoto, así que la bola salía de 0×0 y el
              interruptor se veía como una pastilla lisa sin nada dentro. */}
          <span
            className={`relative flex w-9 h-5 items-center rounded-full border transition-colors ${
              actividad.aplica
                ? 'bg-[#003DA5] border-[#003DA5] justify-end'
                : 'bg-gray-200 border-gray-400 justify-start'
            }`}
          >
            <span
              className={`mx-0.5 w-3.5 h-3.5 rounded-full transition-colors ${
                actividad.aplica ? 'bg-white' : 'bg-gray-500'
              }`}
            />
          </span>
          <span
            className={`text-xs font-bold w-5 text-left ${
              actividad.aplica ? 'text-[#003DA5]' : 'text-gray-700'
            }`}
          >
            {actividad.aplica ? 'Sí' : 'No'}
          </span>
        </button>
      </div>

      {/* El motivo se pide en el sitio, no en otro modal: es un renglón, y
          queda en el expediente de los procesos de esta modalidad, así que
          merece un campo de verdad pero no una ventana propia. */}
      {excluyendo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            cambiarAplicabilidad(false, motivo.trim() || undefined);
          }}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3"
        >
          <label
            htmlFor="motivo-no-aplica"
            className="block text-xs font-bold text-gray-800 mb-1"
          >
            ¿Por qué no se exige en {nombreModalidad}?
          </label>
          <p className="text-[11px] text-gray-500 m-0 mb-2">
            Queda registrado en el expediente de los procesos de esta modalidad.
          </p>
          <input
            id="motivo-no-aplica"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            autoFocus
            maxLength={300}
            placeholder="p. ej. El régimen especial no elabora los documentos ordinarios del proceso"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
          />
          <div className="flex items-center gap-1.5 mt-2">
            <button
              type="submit"
              className="rounded-lg bg-[#003DA5] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#00307f]"
            >
              Marcar que no aplica
            </button>
            <button
              type="button"
              onClick={() => {
                setExcluyendo(false);
                setMotivo('');
              }}
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </>
  );
}
