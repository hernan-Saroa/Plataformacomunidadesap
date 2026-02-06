/**
 * ============================================
 * DIÁLOGO DE CONFIRMACIÓN REUTILIZABLE
 * ============================================
 * 
 * Componente genérico para confirmar acciones destructivas
 * o irreversibles en todo el sistema SIGL.
 * 
 * CARACTERÍSTICAS:
 * 1. Variantes por tipo de acción (danger, warning, info)
 * 2. Animaciones suaves con Framer Motion
 * 3. Mensajes personalizables
 * 4. Botones con estados de carga
 * 5. Accesibilidad con teclado (Escape para cancelar)
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, AlertCircle, Info, Trash2, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './button';

// ============ TIPOS ============

export type ConfirmationVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  loading?: boolean;
  requiresTyping?: boolean;
  confirmationWord?: string;
}

// ============ CONFIGURACIÓN DE VARIANTES ============

const VARIANT_CONFIG = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    borderColor: 'border-red-500',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    confirmText: 'text-white',
    title: 'text-red-900',
    description: 'text-red-700'
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-500',
    confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
    confirmText: 'text-white',
    title: 'text-yellow-900',
    description: 'text-yellow-700'
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-500',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    confirmText: 'text-white',
    title: 'text-blue-900',
    description: 'text-blue-700'
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    borderColor: 'border-green-500',
    confirmBg: 'bg-green-600 hover:bg-green-700',
    confirmText: 'text-white',
    title: 'text-green-900',
    description: 'text-green-700'
  }
};

// ============ COMPONENTE PRINCIPAL ============

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  requiresTyping = false,
  confirmationWord = 'ELIMINAR',
  showDataLossWarning = true
}: ConfirmationDialogProps & { showDataLossWarning?: boolean }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [typedWord, setTypedWord] = useState('');

  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  // Resetear estado al cerrar
  useEffect(() => {
    if (!open) {
      setTypedWord('');
      setIsConfirming(false);
    }
  }, [open]);

  // Manejar tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isConfirming) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, isConfirming, onClose]);

  // Manejar confirmación
  const handleConfirm = async () => {
    if (requiresTyping && typedWord !== confirmationWord) {
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error en confirmación:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const canConfirm = requiresTyping ? typedWord === confirmationWord : true;

  // Only render the portal when open to avoid invisible overlays blocking other elements
  if (!open) return null;

  // Use Portal to avoid z-index and focus trap issues with other modals
  return createPortal(
    <AnimatePresence>
      {/* OVERLAY */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[99998]"
        onClick={!isConfirming ? onClose : undefined}
      />

      {/* DIALOG */}
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`bg-white rounded-lg shadow-2xl w-full max-w-md border-2 ${config.borderColor}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* CONTENIDO */}
          <div className="p-6">
            {/* ICONO */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full ${config.iconBg} flex items-center justify-center`}>
                <Icon className={`w-8 h-8 ${config.iconColor}`} />
              </div>
            </div>

            {/* TÍTULO */}
            <h2 className={`text-xl font-black text-center mb-3 ${config.title}`}>
              {title}
            </h2>

            {/* DESCRIPCIÓN */}
            <p className={`text-sm text-center mb-6 ${config.description}`}>
              {description}
            </p>

            {/* CAMPO DE TIPEO (OPCIONAL) */}
            {requiresTyping && (
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Para confirmar, escribe <span className="font-mono text-red-600">{confirmationWord}</span>
                </label>
                <input
                  type="text"
                  value={typedWord}
                  onChange={(e) => setTypedWord(e.target.value.toUpperCase())}
                  placeholder={`Escribe "${confirmationWord}"`}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 font-mono ${typedWord && typedWord !== confirmationWord
                    ? 'border-red-500'
                    : 'border-gray-300'
                    }`}
                  disabled={isConfirming}
                  autoFocus
                />
                {typedWord && typedWord !== confirmationWord && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    El texto no coincide
                  </p>
                )}
              </div>
            )}

            {/* ADVERTENCIA ADICIONAL */}
            {variant === 'danger' && showDataLossWarning && (
              <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Advertencia:</strong> Esta acción no se puede deshacer. Los datos se eliminarán permanentemente.
                  </span>
                </p>
              </div>
            )}

            {/* BOTONES */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isConfirming}
                className="flex-1"
              >
                {cancelText}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm || isConfirming}
                className={`flex-1 text-white ${config.confirmBg}`}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  confirmText
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

// ============ HOOK PERSONALIZADO ============

export function useConfirmation() {
  const [confirmationState, setConfirmationState] = useState<{
    open: boolean;
    props: Partial<ConfirmationDialogProps>;
  }>({
    open: false,
    props: {}
  });

  const confirm = (props: Omit<ConfirmationDialogProps, 'open' | 'onClose' | 'onConfirm'> & { onConfirm?: () => void | Promise<void> }) => {
    return new Promise<boolean>((resolve) => {
      setConfirmationState({
        open: true,
        props: {
          ...props,
          onConfirm: async () => {
            if (props.onConfirm) await props.onConfirm();
            resolve(true);
          },
          onClose: () => {
            setConfirmationState({ open: false, props: {} });
            resolve(false);
          }
        }
      });
    });
  };

  const ConfirmationComponent = () => (
    <ConfirmationDialog
      open={confirmationState.open}
      onClose={() => setConfirmationState({ open: false, props: {} })}
      title=""
      description=""
      onConfirm={() => { }}
      {...confirmationState.props}
    />
  );

  return { confirm, ConfirmationComponent };
}