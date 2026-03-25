/**
 * RESPONSIVE MODAL WRAPPER - World-Class UX
 * Wrapper universal para modales que se adaptan a cualquier pantalla
 * Desktop: Modal centrado con tamaño fijo
 * Tablet: Modal adaptado al 90% del viewport
 * Mobile: Modal full-screen con navegación optimizada
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft } from 'lucide-react';
import { useResponsive } from './hooks/useResponsive';

interface ResponsiveModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  showBackButton?: boolean;
  headerColor?: string;
  headerGradient?: string;
}

export function ResponsiveModalWrapper({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'xl',
  showBackButton = false,
  headerColor = '#003DA5',
  headerGradient = 'linear-gradient(135deg, #003DA5 0%, #2962FF 100%)',
}: ResponsiveModalWrapperProps) {
  const { isMobile, isTablet, width } = useResponsive();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-full',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            style={{ zIndex: 9998 }}
          />

          {/* Modal */}
          <div
            className="fixed inset-0 flex items-center justify-center z-50 p-0 sm:p-4"
            style={{ zIndex: 9999 }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isMobile) {
                onClose();
              }
            }}
          >
            <motion.div
              initial={
                isMobile
                  ? { y: '100%' }
                  : { scale: 0.9, opacity: 0, y: 20 }
              }
              animate={
                isMobile
                  ? { y: 0 }
                  : { scale: 1, opacity: 1, y: 0 }
              }
              exit={
                isMobile
                  ? { y: '100%' }
                  : { scale: 0.9, opacity: 0, y: 20 }
              }
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`bg-white flex flex-col ${
                isMobile
                  ? 'w-full h-full rounded-none'
                  : isTablet
                  ? 'w-[95vw] max-h-[95vh] rounded-2xl shadow-2xl'
                  : `w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] rounded-2xl shadow-2xl`
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con gradiente ESAP */}
              <div
                className={`flex-shrink-0 flex items-center justify-between ${
                  isMobile ? 'px-4 py-3' : 'px-6 py-4'
                } border-b border-gray-200`}
                style={{ background: headerGradient }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Botón de retroceso en móvil */}
                  {isMobile && showBackButton && (
                    <button
                      onClick={onClose}
                      className="flex-shrink-0 p-2 -ml-2 rounded-lg hover:bg-white/20 transition"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                  )}

                  {/* Título y subtítulo */}
                  <div className="flex-1 min-w-0">
                    <h2
                      className={`font-bold text-white leading-tight truncate ${
                        isMobile ? 'text-base' : 'text-lg'
                      }`}
                    >
                      {title}
                    </h2>
                    {subtitle && (
                      <p
                        className={`text-white/80 leading-tight mt-0.5 truncate ${
                          isMobile ? 'text-xs' : 'text-sm'
                        }`}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botón de cerrar (solo desktop/tablet) */}
                {!isMobile && (
                  <button
                    onClick={onClose}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-white/20 transition"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>

              {/* Contenido con scroll */}
              <div
                className={`flex-1 overflow-y-auto ${
                  isMobile ? 'p-4' : isTablet ? 'p-5' : 'p-6'
                }`}
                style={{
                  WebkitOverflowScrolling: 'touch', // Smooth scrolling en iOS
                }}
              >
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Variante simplificada para modales pequeños
 */
export function ResponsiveModalSimple({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { isMobile } = useResponsive();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-white rounded-xl shadow-2xl ${
                isMobile ? 'w-full max-w-sm' : 'max-w-md'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
