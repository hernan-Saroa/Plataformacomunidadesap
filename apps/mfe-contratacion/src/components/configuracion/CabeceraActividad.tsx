import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ActividadAplicable } from '../../types';
import { Modal } from '../shared/Modal';

interface Props {
  actividad: ActividadAplicable;
  modalidad: string;
  onCambio: (cambios: Partial<ActividadAplicable>) => void;
}

/**
 * Encabezado de la actividad: su texto y si aplica a la modalidad elegida.
 *
 * El nombre y la descripción salían del seed y solo se corregían por SQL, así
 * que una errata obligaba a un despliegue.
 */
export function CabeceraActividad({ actividad, modalidad, onCambio }: Props) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(actividad.nombre);
  const [descripcion, setDescripcion] = useState(actividad.descripcion ?? '');
  const [excluyendo, setExcluyendo] = useState(false);
  const [motivo, setMotivo] = useState('');

  const abrir = () => {
    setNombre(actividad.nombre);
    setDescripcion(actividad.descripcion ?? '');
    setEditando(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contratacionService.actualizarActividad(actividad.numeral, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      });
      onCambio({ nombre: nombre.trim(), descripcion: descripcion.trim() || null });
      setEditando(false);
      toast.success('Actividad actualizada');
    } catch (err: any) {
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
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-bold text-gray-500">Numeral {actividad.numeral}</span>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5 mb-1 leading-snug">
              {actividad.nombre}
            </h2>
            {actividad.descripcion && (
              <p className="text-sm text-gray-600 m-0 leading-relaxed">{actividad.descripcion}</p>
            )}
          </div>
          <button
            type="button"
            onClick={abrir}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 m-0">
              {actividad.aplica ? 'Aplica a esta modalidad' : 'No aplica a esta modalidad'}
            </p>
            {!actividad.aplica && actividad.motivo && (
              <p className="text-[11px] text-gray-500 mt-0.5 mb-0">{actividad.motivo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => (actividad.aplica ? setExcluyendo(true) : cambiarAplicabilidad(true))}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
              actividad.aplica
                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            {actividad.aplica ? 'Marcar que no aplica' : 'Marcar que aplica'}
          </button>
        </div>
      </div>

      <Modal
        isOpen={editando}
        onClose={() => setEditando(false)}
        title="Editar actividad"
        description={`Numeral ${actividad.numeral}`}
        size="medium"
        icon={<Pencil className="w-5 h-5" />}
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00307f]"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* El motivo va en un modal y no en un window.prompt: queda en el
          expediente, así que merece un campo de verdad. */}
      <Modal
        isOpen={excluyendo}
        onClose={() => setExcluyendo(false)}
        title="¿Por qué no aplica?"
        description="Queda registrado en el expediente de los procesos de esta modalidad"
        size="medium"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            cambiarAplicabilidad(false, motivo.trim() || undefined);
          }}
          className="space-y-4"
        >
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            autoFocus
            placeholder="p. ej. El régimen especial no elabora los documentos ordinarios del proceso"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setExcluyendo(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00307f]"
            >
              Marcar que no aplica
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
