/**
 * MODAL ELIMINAR NOTICIA DISCIPLINARIA
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  AlertCircle,
  Trash2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

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
      className="fixed inset-0 bg-black/70 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#FEE2E2' }}>
                <Trash2 className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#DC2626' }}>
                  Eliminar Noticia Disciplinaria
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Advertencia */}
          <div className="p-5 rounded-xl border-l-4" style={{ background: '#FEF2F2', borderColor: '#DC2626' }}>
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#DC2626' }} />
              <div>
                <p className="font-bold mb-2" style={{ color: '#991B1B' }}>
                  ⚠️ ADVERTENCIA: Acción Irreversible
                </p>
                <p className="text-sm mb-3" style={{ color: '#7F1D1D' }}>
                  Estás a punto de eliminar permanentemente la siguiente noticia disciplinaria:
                </p>
                <div className="p-4 rounded-lg border-2" style={{ background: '#FFFFFF', borderColor: '#FECACA' }}>
                  <p className="font-bold mb-1" style={{ color: '#1F2937' }}>{noticia.numeroRadicado}</p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>{noticia.denunciado.nombre}</p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{noticia.denunciado.identificacion}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Motivo de Eliminación <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={motivoEliminacion}
              onChange={(e) => setMotivoEliminacion(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DC2626]"
              style={{ borderColor: '#E5E7EB' }}
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
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Confirmación de Eliminación <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
              Para confirmar, escribe el número de radicado: <span className="font-mono font-bold" style={{ color: '#1F2937' }}>{noticia.numeroRadicado}</span>
            </p>
            <input
              type="text"
              value={confirmacionTexto}
              onChange={(e) => setConfirmacionTexto(e.target.value)}
              placeholder="Escribe el radicado aquí"
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DC2626] font-mono"
              style={{ borderColor: '#E5E7EB' }}
            />
            {confirmacionTexto && confirmacionTexto !== noticia.numeroRadicado && (
              <p className="text-sm mt-2" style={{ color: '#DC2626' }}>❌ El radicado no coincide</p>
            )}
            {confirmacionTexto === noticia.numeroRadicado && (
              <p className="text-sm mt-2" style={{ color: '#059669' }}>✅ Radicado confirmado</p>
            )}
          </div>

          {/* Info adicional */}
          <div className="p-4 rounded-xl border-2 flex items-start gap-3" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
            <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#2563EB' }} />
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              <strong>Nota:</strong> La eliminación quedará registrada en el sistema de auditoría con tu usuario, 
              fecha y hora exacta. Este registro es permanente y no puede ser modificado.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors"
            style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
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