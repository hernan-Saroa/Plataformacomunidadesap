/**
 * ============================================
 * DIÁLOGO DE CONFIRMACIÓN REUTILIZABLE (PORTAL GLOBAL)
 * ============================================
 * 
 * Componente genérico para confirmar acciones destructivas.
 * 
 * REFACTORIZADO 3: Implementación "Portal Global"
 * - Se usa `createPortal` para renderizar el modal directamente en `document.body`.
 * - Esto "saca" el modal de cualquier contexto de apilamiento (stacking context)
 *   del modal padre (Expediente, Tabs, transformaciones, etc.).
 * - Se asegura de estar SIEMPRE encima de todo con z-[100000].
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { cn } from './utils';

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
  showDataLossWarning?: boolean;
}

// ============ CONFIGURACIÓN DE VARIANTES ============

const VARIANT_CONFIG = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    confirmText: 'text-white',
    title: 'text-red-900',
    description: 'text-red-700'
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
    confirmText: 'text-white',
    title: 'text-yellow-900',
    description: 'text-yellow-700'
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    confirmBg: 'bg-blue-600 hover:bg-blue-700',
    confirmText: 'text-white',
    title: 'text-blue-900',
    description: 'text-blue-700'
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200',
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
}: ConfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [typedWord, setTypedWord] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const config = VARIANT_CONFIG[variant || 'danger'];
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
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, isConfirming, onClose]);

  // Manejar confirmación
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-auto">
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isConfirming) onClose();
            }}
          />

          {/* DIALOG BOX */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-sm border p-0 overflow-hidden pointer-events-auto ${config.borderColor}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* ICONO */}
              <div className="flex justify-center mb-4">
                <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${config.iconColor}`} />
                </div>
              </div>

              {/* TÍTULO */}
              <h2 className={`text-lg font-bold text-center mb-2 ${config.title}`}>
                {title}
              </h2>

              {/* DESCRIPCIÓN */}
              <p className="text-sm text-center text-gray-600 mb-6">
                {description}
              </p>

              {/* ADVERTENCIA DE PÉRDIDA DE DATOS */}
              {variant === 'danger' && showDataLossWarning && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="leading-tight">
                      Esta acción no se puede deshacer.
                    </span>
                  </p>
                </div>
              )}

              {/* INPUT PARA ESCRIBIR PALABRA (SI SE REQUIERE) */}
              {requiresTyping && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                    Escribe <span className="text-red-600">"{confirmationWord}"</span>
                  </label>
                  <Input
                    value={typedWord}
                    onChange={(e) => setTypedWord(e.target.value.toUpperCase())}
                    placeholder={confirmationWord}
                    className={cn(
                      "font-mono text-center uppercase tracking-widest",
                      typedWord && typedWord !== confirmationWord ? "border-red-500 focus-visible:ring-red-500" : ""
                    )}
                    autoFocus
                  />
                </div>
              )}

              {/* BOTONES */}
              <div className="flex gap-3 mt-2">
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
                  className={`flex-1 text-white shadow-sm ${config.confirmBg.split(' ')[0]} ${config.confirmBg.split(' ')[1] || ''}`}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ...
                    </>
                  ) : (
                    confirmText
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
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
            resolve(true); // Confirmado
          },
          onClose: () => {
            setConfirmationState({ open: false, props: {} });
            resolve(false); // Cancelado
          }
        }
      });
    });
  };

  const ConfirmationComponent = () => (
    <ConfirmationDialog
      open={confirmationState.open}
      onClose={() => {
        const onCloseProp = confirmationState.props.onClose;
        if (onCloseProp) onCloseProp();
        else setConfirmationState({ open: false, props: {} });
      }}
      title=""
      description=""
      onConfirm={async () => { }}
      {...confirmationState.props}
    />
  );

  return { confirm, ConfirmationComponent };
}
