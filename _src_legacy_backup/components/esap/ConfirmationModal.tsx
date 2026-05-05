import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Shield, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  requiresTyping?: boolean;
  typingConfirmation?: string;
  icon?: React.ReactNode;
  details?: string[];
  loading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'danger',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  requiresTyping = false,
  typingConfirmation = 'ELIMINAR',
  icon,
  details,
  loading = false,
}: ConfirmationModalProps) {
  const [typedText, setTypedText] = useState('');

  const handleConfirm = () => {
    if (requiresTyping && typedText !== typingConfirmation) {
      return;
    }
    onConfirm();
    setTypedText('');
  };

  const handleClose = () => {
    setTypedText('');
    onClose();
  };

  const canConfirm = requiresTyping ? typedText === typingConfirmation : true;

  const typeConfig = {
    danger: {
      bgColor: 'bg-red-600',
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      buttonText: 'text-white',
      headerTextColor: 'text-white',
      icon: <AlertTriangle className="w-6 h-6" />,
    },
    warning: {
      bgColor: 'bg-yellow-600',
      iconBgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-700',
      borderColor: 'border-yellow-600',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
      buttonText: 'text-white',
      headerTextColor: 'text-white',
      icon: <AlertCircle className="w-6 h-6" />,
    },
    info: {
      bgColor: 'bg-[--esap-primary]',
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-[--esap-primary]',
      borderColor: 'border-[--esap-primary]',
      buttonBg: 'bg-[--esap-primary] hover:bg-[#1a4d8a]',
      buttonText: 'text-white',
      headerTextColor: 'text-white',
      icon: <Info className="w-6 h-6" />,
    },
    success: {
      bgColor: 'bg-green-600',
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-600',
      buttonBg: 'bg-green-600 hover:bg-green-700',
      buttonText: 'text-white',
      headerTextColor: 'text-white',
      icon: <CheckCircle2 className="w-6 h-6" />,
    },
  };

  const config = typeConfig[type];

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-[9998]"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto overflow-hidden"
            >
              {/* Header */}
              <div className={`px-6 py-5 ${config.bgColor}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${config.iconBgColor} flex items-center justify-center ${config.iconColor} flex-shrink-0 shadow-sm`}>
                    {icon || config.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${config.headerTextColor} mb-1`}>
                      {title}
                    </h3>
                    <p className={`text-sm ${config.headerTextColor} opacity-90 leading-relaxed`}>
                      {description}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className={`p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0`}
                    disabled={loading}
                  >
                    <X className={`w-5 h-5 ${config.headerTextColor} opacity-80 hover:opacity-100`} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {/* Details */}
                {details && details.length > 0 && (
                  <div className="mb-5 p-4 bg-[--esap-gray-50] rounded-lg border border-[--esap-gray-200]">
                    <p className="text-xs font-bold text-[--esap-gray-700] mb-2">
                      Esta acción afectará a:
                    </p>
                    <ul className="space-y-1">
                      {details.map((detail, index) => (
                        <li key={index} className="text-xs text-[--esap-gray-600] flex items-start gap-2">
                          <span className="text-[--esap-gray-400] mt-0.5">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Typing Confirmation */}
                {requiresTyping && (
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-[--esap-gray-900] mb-2">
                      Escribe <code className="px-2 py-0.5 bg-[--esap-gray-100] rounded text-red-600 font-mono">{typingConfirmation}</code> para confirmar:
                    </label>
                    <input
                      type="text"
                      value={typedText}
                      onChange={(e) => setTypedText(e.target.value)}
                      placeholder={typingConfirmation}
                      className="w-full px-4 py-2.5 border-2 border-[--esap-gray-300] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                      autoFocus
                      disabled={loading}
                    />
                    {typedText && typedText !== typingConfirmation && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        El texto no coincide
                      </p>
                    )}
                  </div>
                )}

                {/* Warning message */}
                {type === 'danger' && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800">
                      <strong>Advertencia:</strong> Esta acción no se puede deshacer.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[--esap-gray-50] border-t border-[--esap-gray-200] flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-bold text-[--esap-gray-700] bg-white border border-[--esap-gray-300] rounded-lg hover:bg-[--esap-gray-100] transition-colors"
                  disabled={loading}
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || loading}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonBg} ${config.buttonText} ${
                    canConfirm && !loading ? 'hover:shadow-lg hover:-translate-y-0.5' : ''
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook para usar el modal de confirmación
export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    description: string;
    type?: ConfirmationType;
    confirmText?: string;
    cancelText?: string;
    requiresTyping?: boolean;
    typingConfirmation?: string;
    icon?: React.ReactNode;
    details?: string[];
    loading?: boolean;
  }>({
    title: '',
    description: '',
  });
  
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: {
    title: string;
    description: string;
    type?: ConfirmationType;
    confirmText?: string;
    cancelText?: string;
    requiresTyping?: boolean;
    typingConfirmation?: string;
    icon?: React.ReactNode;
    details?: string[];
    loading?: boolean;
    onConfirm?: () => void;
  }) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setModalConfig(options);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setIsOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setIsOpen(false);
  }, []);

  const ConfirmationDialog = useCallback(() => (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={modalConfig.title}
      description={modalConfig.description}
      type={modalConfig.type}
      confirmText={modalConfig.confirmText}
      cancelText={modalConfig.cancelText}
      requiresTyping={modalConfig.requiresTyping}
      typingConfirmation={modalConfig.typingConfirmation}
      icon={modalConfig.icon}
      details={modalConfig.details}
      loading={modalConfig.loading}
    />
  ), [isOpen, handleClose, handleConfirm, modalConfig]);

  return { confirm, ConfirmationDialog };
}
