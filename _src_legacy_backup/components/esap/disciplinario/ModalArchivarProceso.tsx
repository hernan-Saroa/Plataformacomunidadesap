/**
 * MODAL ARCHIVAR PROCESO DISCIPLINARIO
 * Diseño actualizado alineado con el estándar ESAP (SIGL v5.0)
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  AlertCircle,
  Archive,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Proceso {
  id: string;
  consecutivo: string;
  disciplinable: {
    nombre: string;
    identificacion: string;
  };
}

interface Props {
  proceso: Proceso;
  onClose: () => void;
  onConfirm: () => void;
}

export function ModalArchivarProceso({ proceso, onClose, onConfirm }: Props) {
  const [motivoArchivo, setMotivoArchivo] = useState('');
  const [confirmacionTexto, setConfirmacionTexto] = useState('');

  const handleArchivar = () => {
    if (confirmacionTexto !== proceso.consecutivo) {
      toast.error('Confirmación incorrecta', {
        description: 'Debes escribir correctamente el consecutivo del proceso para confirmar'
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
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 p-4 z-[200]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl"
      >
        {/* Header - Blanco */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#FEE2E2' }}>
                <Archive className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#DC2626' }}>
                  Archivar Proceso Disciplinario
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Esta acción se puede revertir
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
        <div className="p-6 space-y-5">
          {/* Advertencia */}
          <div className="p-4 rounded-xl border-l-4" style={{ background: '#FEF2F2', borderColor: '#DC2626' }}>
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
              <div className="flex-1">
                <p className="font-bold text-sm mb-2" style={{ color: '#991B1B' }}>
                  ⚠️ ADVERTENCIA: Acción de Archivo
                </p>
                <p className="text-sm mb-3" style={{ color: '#7F1D1D' }}>
                  Estás a punto de archivar permanentemente el siguiente proceso disciplinario:
                </p>
                <div className="p-3 rounded-lg border-2" style={{ background: '#FFFFFF', borderColor: '#FECACA' }}>
                  <p className="font-bold" style={{ color: '#1F2937' }}>{proceso.consecutivo}</p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>{proceso.disciplinable.nombre}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>{proceso.disciplinable.identificacion}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Motivo de Archivo */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Motivo de Archivo <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={motivoArchivo}
              onChange={(e) => setMotivoArchivo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DC2626]"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="">Selecciona un motivo...</option>
              <option value="sancion_ejecutoriada">Sanción ejecutoriada</option>
              <option value="archivo_definitivo">Archivo definitivo</option>
              <option value="prescripcion">Prescripción de la acción disciplinaria</option>
              <option value="incompetencia">Incompetencia</option>
              <option value="muerte_disciplinado">Muerte del disciplinado</option>
              <option value="otro">Otro motivo</option>
            </select>
          </div>

          {/* Confirmación de Archivo */}
          <div>
            <label className="block mb-2 text-sm font-bold uppercase" style={{ color: '#4B5563' }}>
              Confirmación de Archivo <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
              Para confirmar, escribe el consecutivo del proceso: <span className="font-mono font-semibold" style={{ color: '#1F2937' }}>{proceso.consecutivo}</span>
            </p>
            <input
              type="text"
              value={confirmacionTexto}
              onChange={(e) => setConfirmacionTexto(e.target.value)}
              placeholder="Escribe el consecutivo aquí"
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-[#DC2626] font-mono"
              style={{ borderColor: '#E5E7EB' }}
            />
            {confirmacionTexto && confirmacionTexto !== proceso.consecutivo && (
              <p className="text-xs mt-2" style={{ color: '#DC2626' }}>❌ El consecutivo no coincide</p>
            )}
            {confirmacionTexto === proceso.consecutivo && (
              <p className="text-xs mt-2" style={{ color: '#059669' }}>✅ Consecutivo confirmado</p>
            )}
          </div>

          {/* Nota */}
          <div className="p-4 rounded-xl border-2 flex items-start gap-3" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
            <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#2563EB' }} />
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              <strong>Nota:</strong> La acción de archivo quedará registrada en el sistema de auditoría con tu usuario, 
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
            onClick={handleArchivar}
            disabled={confirmacionTexto !== proceso.consecutivo || !motivoArchivo}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90"
            style={{ 
              background: confirmacionTexto === proceso.consecutivo && motivoArchivo ? '#DC2626' : '#9CA3AF'
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