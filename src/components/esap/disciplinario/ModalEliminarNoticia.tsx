/**
 * MODAL ELIMINAR NOTICIA DISCIPLINARIA
 * Con confirmación de seguridad para eliminar permanentemente
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Card } from '../../ui/card';
import { toast } from 'sonner@2.0.3';

interface NoticiaDisciplinaria {
  id: string;
  numeroRadicado: string;
  denunciado: {
    nombre: string;
    identificacion: string;
  };
}

interface Props {
  noticia: NoticiaDisciplinaria;
  onClose: () => void;
  onConfirm: () => void;
}

export function ModalEliminarNoticia({ noticia, onClose, onConfirm }: Props) {
  const [motivoEliminacion, setMotivoEliminacion] = useState('');
  const [confirmacionTexto, setConfirmacionTexto] = useState('');

  const handleEliminar = () => {
    if (confirmacionTexto !== noticia.numeroRadicado) {
      toast.error('Confirmación incorrecta', {
        description: 'Debes escribir correctamente el número de radicado para confirmar'
      });
      return;
    }
    
    if (!motivoEliminacion.trim()) {
      toast.error('Motivo requerido', {
        description: 'Debes especificar el motivo de la eliminación'
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
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-900">
                  Eliminar Noticia Disciplinaria
                </h2>
                <p className="text-sm text-red-700">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Advertencia */}
          <Card className="p-5 bg-red-50 border-2 border-red-300">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-bold text-red-900 mb-2">⚠️ ADVERTENCIA: Acción Irreversible</p>
                <p className="text-sm text-red-800 mb-3">
                  Estás a punto de eliminar permanentemente la siguiente noticia disciplinaria:
                </p>
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <p className="font-bold text-gray-900 mb-1">{noticia.numeroRadicado}</p>
                  <p className="text-sm text-gray-700">{noticia.denunciado.nombre}</p>
                  <p className="text-xs text-gray-600 mt-1">{noticia.denunciado.identificacion}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Motivo */}
          <div>
            <label className="block font-bold mb-2 text-gray-900">
              Motivo de Eliminación <span className="text-red-600">*</span>
            </label>
            <select
              value={motivoEliminacion}
              onChange={(e) => setMotivoEliminacion(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 bg-white"
            >
              <option value="">Selecciona un motivo...</option>
              <option value="duplicado">Noticia duplicada</option>
              <option value="error_registro">Error en el registro</option>
              <option value="sin_merito">Sin mérito para investigación</option>
              <option value="competencia">Fuera de competencia</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>

          {/* Confirmación */}
          <div>
            <label className="block font-bold mb-2 text-gray-900">
              Confirmación de Eliminación <span className="text-red-600">*</span>
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Para confirmar, escribe el número de radicado: <span className="font-mono font-bold text-gray-900">{noticia.numeroRadicado}</span>
            </p>
            <input
              type="text"
              value={confirmacionTexto}
              onChange={(e) => setConfirmacionTexto(e.target.value)}
              placeholder="Escribe el radicado aquí"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 font-mono"
            />
            {confirmacionTexto && confirmacionTexto !== noticia.numeroRadicado && (
              <p className="text-sm text-red-600 mt-2">❌ El radicado no coincide</p>
            )}
            {confirmacionTexto === noticia.numeroRadicado && (
              <p className="text-sm text-green-600 mt-2">✅ Radicado confirmado</p>
            )}
          </div>

          {/* Info adicional */}
          <Card className="p-4 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Nota:</strong> La eliminación quedará registrada en el sistema de auditoría con tu usuario, 
              fecha y hora exacta. Este registro es permanente y no puede ser modificado.
            </p>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            disabled={confirmacionTexto !== noticia.numeroRadicado || !motivoEliminacion}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all"
            style={{ background: '#DC2626' }}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar Permanentemente
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
