import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Modal } from '../shared/Modal';

interface Props {
  abierto: boolean;
  cuantasModalidades: number;
  modalidadActual: string;
  onCambiarEnTodas: () => void;
  onCrearExcepcion: () => void;
  onCancelar: () => void;
}

/**
 * Aviso antes de editar una regla que aplica a todas las modalidades.
 *
 * Es el error caro de este módulo: el administrador trabaja mirando una
 * modalidad y da por hecho que edita solo esa. La regla global es la mayoría,
 * así que sin este paso el cambio se propaga a las once sin que nadie lo note
 * hasta que un gestor no puede enviar su estudio previo.
 */
export function DialogoImpacto({
  abierto,
  cuantasModalidades,
  modalidadActual,
  onCambiarEnTodas,
  onCrearExcepcion,
  onCancelar,
}: Props) {
  return (
    <Modal
      isOpen={abierto}
      onClose={onCancelar}
      title="Esta regla aplica a todas las modalidades"
      size="medium"
      icon={<AlertTriangle className="w-5 h-5" />}
      color="#B45309"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700 m-0 leading-relaxed">
          El cambio afectaría a{' '}
          <span className="font-bold">{cuantasModalidades} modalidades</span>, no solo a{' '}
          {modalidadActual}. Elige qué quieres hacer.
        </p>

        <button
          type="button"
          onClick={onCambiarEnTodas}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left hover:border-[#003DA5] hover:bg-[#E0EDFF]/40 transition-colors"
        >
          <span className="block text-sm font-bold text-gray-900">Cambiarla en todas</span>
          <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
            La regla sigue siendo común. Úsalo cuando la corrección vale para cualquier modalidad,
            como una errata en el mensaje.
          </span>
        </button>

        <button
          type="button"
          onClick={onCrearExcepcion}
          className="w-full rounded-lg border border-[#003DA5] bg-[#E0EDFF]/40 px-4 py-3 text-left hover:bg-[#E0EDFF] transition-colors"
        >
          <span className="block text-sm font-bold text-[#003DA5]">
            Crear una excepción para {modalidadActual}
          </span>
          <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
            La global queda intacta y esta modalidad pasa a regirse por la nueva. Es lo habitual
            cuando solo una modalidad se comporta distinto.
          </span>
        </button>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
