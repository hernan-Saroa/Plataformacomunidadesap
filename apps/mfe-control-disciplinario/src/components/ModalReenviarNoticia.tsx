/**
 * MODAL REENVIAR NOTICIA AL JEFE — WORLD CLASS ESAP SIGL v5.0
 * El Radicador confirma el reenvio de una noticia devuelta ya corregida
 * y puede dejar una observacion para el Jefe.
 */

import { useState } from 'react';
import { CornerUpLeft, Info } from 'lucide-react';
import {
  WorldClassModal, WCLabel, WCTextarea,
  WCInfoBox, WCBotonSecundario
} from './WorldClassModalBase';

interface NoticiaDisciplinaria {
  id: string;
  numeroRadicado: string;
  denunciado: { nombre: string; identificacion: string };
}

interface Props {
  noticia: NoticiaDisciplinaria;
  onClose: () => void;
  onConfirm: (observaciones: string) => void;
}

export function ModalReenviarNoticia({ noticia, onClose, onConfirm }: Props) {
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleReenviar = () => {
    if (enviando) return;
    setEnviando(true);
    onConfirm(observaciones.trim());
  };

  const pie = (
    <>
      <WCBotonSecundario onClick={onClose}>Cancelar</WCBotonSecundario>
      <button
        onClick={handleReenviar}
        disabled={enviando}
        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
        style={{
          background: enviando ? '#93C5FD' : '#2563EB',
          cursor: enviando ? 'not-allowed' : 'pointer',
        }}
      >
        <CornerUpLeft className="w-4 h-4" /> Reenviar al Jefe
      </button>
    </>
  );

  return (
    <WorldClassModal
      titulo="Reenviar Noticia al Jefe"
      subtitulo={noticia.numeroRadicado}
      icono={<CornerUpLeft className="w-5 h-5 text-white" />}
      ancho={560}
      pie={pie}
      onCerrar={onClose}
    >
      <WCInfoBox>
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
          <div>
            <p className="font-bold text-blue-800 mb-1">Vas a reenviar para valoracion:</p>
            <div className="rounded-lg bg-white border border-blue-200 px-3 py-2">
              <p className="font-bold text-sm text-gray-900">{noticia.numeroRadicado}</p>
              <p className="text-xs text-gray-600">{noticia.denunciado.nombre}</p>
              <p className="text-xs text-gray-400">{noticia.denunciado.identificacion}</p>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              El Jefe OCID recibira una notificacion de que la noticia fue corregida y reenviada.
            </p>
          </div>
        </div>
      </WCInfoBox>

      <div>
        <WCLabel>Observacion (opcional)</WCLabel>
        <WCTextarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          placeholder="Describe brevemente los ajustes realizados a la noticia..."
          rows={4}
        />
      </div>
    </WorldClassModal>
  );
}
