/**
 * TOAST SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 * Sección 2.6 - Notificaciones/Toasts
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import DESIGN_TOKENS from './tokens';

// ========================================
// TIPOS
// ========================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

// ========================================
// CONTEXT
// ========================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// ========================================
// TOAST PROVIDER
// ========================================

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = { ...toast, id };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        // Limitar el número de toasts
        return updated.slice(0, maxToasts);
      });

      // Auto-dismiss después de duration (default 5s)
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }
    },
    [maxToasts]
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

// ========================================
// TOAST CONTAINER
// ========================================

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2"
      style={{
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// ========================================
// TOAST ITEM
// ========================================

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const variantConfig = {
    success: {
      bg: '#E8F8F5',
      border: DESIGN_TOKENS.colors.status.green,
      text: '#155724',
      icon: <CheckCircle size={20} />,
      title: 'Éxito',
    },
    error: {
      bg: '#FDF8F8',
      border: DESIGN_TOKENS.colors.status.red,
      text: '#721C24',
      icon: <XCircle size={20} />,
      title: 'Error',
    },
    warning: {
      bg: '#FFF8E1',
      border: DESIGN_TOKENS.colors.status.yellow,
      text: '#856404',
      icon: <AlertTriangle size={20} />,
      title: 'Advertencia',
    },
    info: {
      bg: '#E8F4F8',
      border: '#17A2B8',
      text: '#0C5460',
      icon: <Info size={20} />,
      title: 'Información',
    },
  };

  const config = variantConfig[toast.variant];
  const duration = toast.duration ?? 5000;

  // Progress bar animation
  React.useEffect(() => {
    if (duration <= 0 || isPaused) return;

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [duration, isPaused]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden"
      style={{
        width: '320px',
        minHeight: '60px',
        background: config.bg,
        border: `2px solid ${config.border}`,
        borderRadius: DESIGN_TOKENS.borderRadius.medium,
        boxShadow: DESIGN_TOKENS.shadows.level2,
        pointerEvents: 'auto',
      }}
    >
      {/* Content */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0"
          style={{ color: config.border }}
        >
          {config.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h4
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.body,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
              color: config.text,
              marginBottom: '4px',
            }}
          >
            {toast.title || config.title}
          </h4>
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              color: config.text,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.small,
              wordBreak: 'break-word',
            }}
          >
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => onClose(toast.id)}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: config.text,
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar */}
      {duration > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{
            background: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
            style={{
              height: '100%',
              background: config.border,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

// Import React for useEffect
import * as React from 'react';

// ========================================
// HELPER FUNCTIONS (shortcuts)
// ========================================

export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    // Esta función se debe usar con el hook useToast
    // toast.success('Operación exitosa')
    console.warn('Use useToast hook: const { showToast } = useToast()');
  },
  error: (message: string, title?: string, duration?: number) => {
    console.warn('Use useToast hook: const { showToast } = useToast()');
  },
  warning: (message: string, title?: string, duration?: number) => {
    console.warn('Use useToast hook: const { showToast } = useToast()');
  },
  info: (message: string, title?: string, duration?: number) => {
    console.warn('Use useToast hook: const { showToast } = useToast()');
  },
};
