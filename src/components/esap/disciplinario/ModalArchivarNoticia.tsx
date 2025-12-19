/**
 * MODAL ARCHIVAR NOTICIA DISCIPLINARIA
 * Diseño EXACTO al modal de referencia (imagen amarilla)
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  AlertCircle,
  Archive
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface NoticiaDisciplinaria {
  id: string;
  numeroRadicado: string;
  disciplinable: {
    nombre: string;
    cedula?: string;
  }[];
}

interface Props {
  noticia: NoticiaDisciplinaria;
  onClose: () => void;
  onConfirm: () => void;
}

export function ModalArchivarNoticia({ noticia, onClose, onConfirm }: Props) {
  const [motivoArchivo, setMotivoArchivo] = useState('');
  const [confirmacionTexto, setConfirmacionTexto] = useState('');

  const handleArchivar = () => {
    if (confirmacionTexto !== noticia.numeroRadicado) {
      toast.error('Confirmación incorrecta', {
        description: 'Debes escribir correctamente el número de radicado para confirmar'
      });
      return;
    }

    if (!motivoArchivo.trim()) {
      toast.error('Motivo requerido', {
        description: 'Debes seleccionar el motivo del archivo'
      });
      return;
    }

    onConfirm();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl"
      >
        {/* Header - Blanco */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900">
                Archivar Noticia Disciplinaria
              </h2>
              <p className="text-xs text-gray-600">
                Esta acción se puede revertir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-5 space-y-5">
          {/* Advertencia */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-900 text-sm mb-2">
                  ⚠️ ADVERTENCIA: Acción irreversible
                </p>
                <p className="text-sm text-red-800 mb-3">
                  Estás a punto de archivar permanentemente la siguiente noticia disciplinaria:
                </p>
                <div className="bg-white rounded-lg p-3 border border-red-200 shadow-sm">
                  <p className="font-bold text-gray-900">{noticia.numeroRadicado}</p>
                  <p className="text-sm text-gray-700">{noticia.disciplinable[0]?.nombre || 'Sin nombre'}</p>
                  <p className="text-xs text-gray-500">{noticia.disciplinable[0]?.cedula || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Motivo de Archivo */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Motivo de Archivo <span className="text-red-600">*</span>
            </label>
            <select
              value={motivoArchivo}
              onChange={(e) => setMotivoArchivo(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
            >
              <option value="">Selecciona un motivo...</option>
              <option value="duplicado">Noticia duplicada</option>
              <option value="error_registro">Error en el registro</option>
              <option value="sin_merito">Sin mérito para investigación</option>
              <option value="competencia">Fuera de competencia</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>

          {/* Confirmación de Archivo */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Confirmación de Archivo <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Para confirmar, escribe el número de radicado: <span className="font-mono font-semibold text-gray-900">{noticia.numeroRadicado}</span>
            </p>
            <input
              type="text"
              value={confirmacionTexto}
              onChange={(e) => setConfirmacionTexto(e.target.value)}
              placeholder="Escribe el radicado aquí"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
            />
            {confirmacionTexto && confirmacionTexto !== noticia.numeroRadicado && (
              <p className="text-xs text-red-600 mt-1.5">❌ El radicado no coincide</p>
            )}
            {confirmacionTexto === noticia.numeroRadicado && (
              <p className="text-xs text-green-600 mt-1.5">✅ Radicado confirmado</p>
            )}
          </div>

          {/* Nota */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-gray-700">
              <strong className="text-gray-900">Nota:</strong> La acción de archivo quedará registrada en el sistema de auditoría con tu usuario,
              fecha y hora exacta. Este registro es permanente y no puede ser modificado.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleArchivar}
            disabled={confirmacionTexto !== noticia.numeroRadicado || !motivoArchivo}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: confirmacionTexto === noticia.numeroRadicado && motivoArchivo ? '#DC2626' : '#9CA3AF'
            }}
          >
            <Archive className="w-4 h-4" />
            Archivar Permanentemente
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
