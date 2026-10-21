import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

import { EstudioPrevio } from '../../types';
import { Modal } from '../shared/Modal';
import { LecturaEstudioPrevio } from './LecturaEstudioPrevio';

/**
 * El estudio previo a mano desde cualquier punto del proceso.
 *
 * Casi todo lo que se hace después de la 3.1 se apoya en él —el objeto, la
 * cuantía, la modalidad, los soportes—, y para consultarlo había que volver a
 * la actividad y abrirla como si se fuera a editar. Aquí se abre encima, en la
 * misma lectura que usa el abogado al revisarlo, y al cerrar se sigue donde
 * se estaba.
 */
export function VerEstudioPrevio({ estudio, procesoId }: { estudio: EstudioPrevio; procesoId: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#003DA5]/30
          bg-white text-[11.5px] font-bold text-[#003DA5] hover:bg-[#E0EDFF] transition-colors flex-shrink-0"
      >
        <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
        Ver estudio previo
      </button>
      <Modal
        isOpen={abierto}
        onClose={() => setAbierto(false)}
        title="Estudio previo"
        description={`${estudio.proceso.radicado} · solo lectura`}
        size="xlarge"
        icon={<BookOpen className="w-5 h-5" />}
      >
        <LecturaEstudioPrevio estudio={estudio} procesoId={procesoId} />
      </Modal>
    </>
  );
}
