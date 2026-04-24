/**
 * Componente de diálogo de confirmación - Diseño Corporativo ESAP
 * @version 2.0.0
 * Colores corporativos ESAP: #2962FF / #003DA5
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'danger',
  icon
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-100',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconBg: 'bg-yellow-100',
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconBg: 'bg-blue-100',
          icon: 'text-blue-600',
          button: 'bg-[#2962FF] hover:bg-[#003DA5]'
        };
      default:
        return {
          bg: 'bg-red-50',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-100',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700'
        };
    }
  };

  const colors = getColors();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[9999]"
            onClick={onCancel}
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200"
            >
              {/* Header con icono - Diseño ESAP */}
              <div className={`${colors.bg} px-6 py-5 border-b ${colors.borderColor}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${colors.iconBg} ${colors.icon} flex items-center justify-center`}>
                    {icon || <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {message}
                    </p>
                  </div>
                  <button
                    onClick={onCancel}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Footer con botones - Diseño ESAP */}
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onCancel();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${colors.button} transition-all shadow-sm hover:shadow-md`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}