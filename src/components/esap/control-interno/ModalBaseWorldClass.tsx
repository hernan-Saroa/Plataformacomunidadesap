/**
 * ============================================
 * MODAL BASE WORLD CLASS - ESAP
 * ============================================
 * 
 * Componente base para TODOS los modales del sistema OCI.
 * Garantiza posicionamiento consistente: CENTRADO VERTICAL Y HORIZONTAL.
 * 
 * POSICIONAMIENTO DEFINITIVO:
 * - Overlay: fixed inset-0 con flex + overflow-y-auto
 * - Contenedor: items-center (centro vertical) + justify-center (centro horizontal)
 * - Modal: max-h-[90vh] para evitar desbordamiento + my-8 para margen
 * - z-index: 9999 para estar siempre encima
 * 
 * USO:
 * <ModalBaseWorldClass
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Título del Modal"
 *   size="lg"
 * >
 *   {children}
 * </ModalBaseWorldClass>
 */

import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

interface ModalBaseWorldClassProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  showCloseButton?: boolean;
  headerIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  closeOnOverlayClick?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]'
};

export function ModalBaseWorldClass({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  showCloseButton = true,
  headerIcon,
  headerActions,
  footerActions,
  closeOnOverlayClick = true
}: ModalBaseWorldClassProps) {
  
  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* OVERLAY - POSICIONAMIENTO DEFINITIVO */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto flex items-center justify-center p-6"
            onClick={handleOverlayClick}
          >
            {/* MODAL CONTAINER - CENTRADO VERTICAL Y HORIZONTALMENTE */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]}
                flex flex-col
                relative
                max-h-[90vh]
                my-8
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              {(title || headerIcon || showCloseButton) && (
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {headerIcon && (
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 mt-1">
                        {headerIcon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {title && (
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                          {title}
                        </h2>
                      )}
                      {subtitle && (
                        <p className="text-sm text-gray-600">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {headerActions}
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-lg transition-colors flex-shrink-0"
                        aria-label="Cerrar modal"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {children}
              </div>

              {/* FOOTER */}
              {footerActions && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  {footerActions}
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}