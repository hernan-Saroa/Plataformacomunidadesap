/**
 * MODAL RESPONSIVE UNIFICADO
 * Componente de modal optimizado para mobile y desktop
 * Usado en todos los módulos del Backoffice
 */

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  headerColor?: string;
  footer?: ReactNode;
  zIndex?: number;
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = '2xl',
  headerColor = '#003DA5',
  footer,
  zIndex = 111 // Cambiado de 50 a 111 para quedar sobre el TopBar (z-[101])
}: ResponsiveModalProps) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4 pt-16 sm:pt-4 overflow-y-auto"
          style={{ zIndex }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`w-full ${maxWidthClass[maxWidth]} rounded-xl sm:rounded-2xl shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col my-4`}
            style={{ background: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b flex-shrink-0" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    {icon && (
                      <div className="flex-shrink-0">
                        {icon}
                      </div>
                    )}
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black truncate" style={{ color: headerColor }}>
                      {title}
                    </h2>
                  </div>
                  {subtitle && (
                    <p className="text-xs sm:text-sm" style={{ color: '#6B7280' }}>
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" style={{ color: '#6B7280' }} />
                </button>
              </div>
            </div>

            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {children}
            </div>

            {/* Footer opcional */}
            {footer && (
              <div className="p-4 sm:p-6 border-t flex-shrink-0" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}