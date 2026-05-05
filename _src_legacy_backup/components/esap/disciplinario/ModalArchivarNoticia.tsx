/**
 * MODAL ARCHIVAR NOTICIA — WORLD CLASS ESAP SIGL v5.0
 */

import { useState } from 'react';
import { Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  WorldClassModal, WCLabel, WCSelect, WCInput,
  WCWarningBox, WCBotonPrimario, WCBotonSecundario, WC_TOKENS
} from './WorldClassModalBase';

interface NoticiaDisciplinaria {
  id: string;
  numeroRadicado: string;
  denunciado: { nombre: string; identificacion: string };
}

interface Props { noticia: NoticiaDisciplinaria; onClose: () => void; onConfirm: () => void; }

export function ModalArchivarNoticia({ noticia, onClose, onConfirm }: Props) {
  const [motivo, setMotivo]         = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  const handleArchivar = () => {
    if (!motivo)                          { toast.error('Selecciona el motivo del archivo'); return; }
    if (confirmacion !== noticia.numeroRadicado) { toast.error('El número de radicado no coincide'); return; }
    onConfirm();
  };

  const pie = (
    <>
      <WCBotonSecundario onClick={onClose}>Cancelar</WCBotonSecundario>
      <button
        onClick={handleArchivar}
        disabled={confirmacion !== noticia.numeroRadicado || !motivo}
        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
        style={{
          background: confirmacion === noticia.numeroRadicado && motivo ? '#DC2626' : '#D1D5DB',
          cursor: confirmacion === noticia.numeroRadicado && motivo ? 'pointer' : 'not-allowed',
        }}
      >
        <Archive className="w-4 h-4" /> Archivar Noticia
      </button>
    </>
  );

  return (
    <WorldClassModal
      titulo="Archivar Noticia"
      subtitulo={noticia.numeroRadicado}
      icono={<Archive className="w-5 h-5 text-white" />}
      ancho={560}
      pie={pie}
      onCerrar={onClose}
    >
      <WCWarningBox>
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-bold text-amber-800 mb-1">Estás a punto de archivar:</p>
            <div className="rounded-lg bg-white border border-amber-200 px-3 py-2">
              <p className="font-bold text-sm text-gray-900">{noticia.numeroRadicado}</p>
              <p className="text-xs text-gray-600">{noticia.denunciado.nombre}</p>
              <p className="text-xs text-gray-400">{noticia.denunciado.identificacion}</p>
            </div>
          </div>
        </div>
      </WCWarningBox>

      <div>
        <WCLabel required>Motivo de archivo</WCLabel>
        <WCSelect value={motivo} onChange={e => setMotivo(e.target.value)}>
          <option value="">Selecciona un motivo...</option>
          <option value="duplicado">Noticia duplicada</option>
          <option value="error_registro">Error en el registro</option>
          <option value="sin_merito">Sin mérito para investigación</option>
          <option value="competencia">Fuera de competencia</option>
          <option value="otro">Otro motivo</option>
        </WCSelect>
      </div>

      <div>
        <WCLabel required>Confirmación</WCLabel>
        <p className="text-xs text-gray-500 mb-1.5">
          Para confirmar, escribe el número de radicado: <code className="font-mono font-bold text-gray-800">{noticia.numeroRadicado}</code>
        </p>
        <WCInput
          type="text"
          value={confirmacion}
          onChange={e => setConfirmacion(e.target.value)}
          placeholder={noticia.numeroRadicado}
        />
        {confirmacion && confirmacion !== noticia.numeroRadicado && (
          <p className="text-xs text-red-500 mt-1">El número no coincide</p>
        )}
      </div>
    </WorldClassModal>
  );
}
