/**
 * MODAL DE CONFIRMACIÓN GENÉRICA
 * Modal estético para confirmar acciones como eliminación
 * Alineado con el estándar ESAP (SIGL v5.0)
 */

import { motion } from 'motion/react';
import {
  X,
  AlertTriangle,
  Check,
  X as XIcon
} from 'lucide-react';

interface Props {
  titulo: string;
  mensaje: string;
  detalle?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  tipo?: 'peligro' | 'advertencia' | 'info';
}

export function ModalConfirmacion({
  titulo,
  mensaje,
  detalle,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
  tipo = 'peligro'
}: Props) {
  const colores = {
    peligro: {
      bg: '#FEE2E2',
      border: '#FECACA',
      text: '#DC2626',
      button: '#DC2626'
    },
    advertencia: {
      bg: '#FEF3C7',
      border: '#FDE68A',
      text: '#D97706',
      button: '#D97706'
    },
    info: {
      bg: '#EFF6FF',
      border: '#DBEAFE',
      text: '#2563EB',
      button: '#2563EB'
    }
  };

  const colorScheme = colores[tipo];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[1000]"
      onClick={(e) => e.target === e.currentTarget && onCancelar()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: colorScheme.bg }}
              >
                <AlertTriangle className="w-6 h-6" style={{ color: colorScheme.text }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {titulo}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Confirma tu acción
                </p>
              </div>
            </div>
            <button
              onClick={onCancelar}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <div className="space-y-4">
            <p className="text-gray-700">{mensaje}</p>
            {detalle && (
              <div className="p-4 rounded-lg border-2" style={{ background: colorScheme.bg, borderColor: colorScheme.border }}>
                <p className="text-sm font-medium" style={{ color: colorScheme.text }}>{detalle}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 bg-gray-50">
          <button
            onClick={onCancelar}
            className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-center gap-2">
              <XIcon className="w-4 h-4" />
              {textoCancelar}
            </div>
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            style={{ background: colorScheme.button }}
          >
            <Check className="w-4 h-4" />
            {textoConfirmar}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}