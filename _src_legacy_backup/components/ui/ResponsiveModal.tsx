import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useResponsive';

/**
 * ═══════════════════════════════════════════════════════════════
 * RESPONSIVE MODAL - MOBILE FIRST
 * ═══════════════════════════════════════════════════════════════
 * 
 * Modal adaptativo con comportamiento responsive:
 * - Mobile: Full-screen modal (slide-up animation)
 * - Tablet: Drawer lateral desde la derecha
 * - Desktop: Centered dialog con overlay
 * 
 * Features:
 * - Portal rendering
 * - Focus trap (accesibilidad)
 * - Escape key support
 * - Click outside to close
 * - Touch-optimized
 * - Scroll lock cuando está abierto
 * - ARIA completo
 * 
 * @example
 * ```tsx
 * <ResponsiveModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Crear Usuario"
 *   variant="default"
 *   size="md"
 * >
 *   <p>Contenido del modal</p>
 * </ResponsiveModal>
 * ```
 */

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export interface ResponsiveModalProps {
  /** Modal abierto/cerrado */
  isOpen: boolean;
  
  /** Callback al cerrar */
  onClose: () => void;
  
  /** Título del modal */
  title?: string;
  
  /** Contenido del modal */
  children: React.ReactNode;
  
  /** Footer del modal (botones, acciones) */
  footer?: React.ReactNode;
  
  /** Variante visual */
  variant?: 'default' | 'drawer' | 'fullscreen';
  
  /** Tamaño del modal (desktop) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /** Deshabilitar cierre con click fuera */
  disableBackdropClick?: boolean;
  
  /** Deshabilitar cierre con ESC */
  disableEscapeKey?: boolean;
  
  /** Mostrar botón de cerrar */
  showCloseButton?: boolean;
  
  /** Clase adicional para el contenido */
  className?: string;
  
  /** z-index custom */
  zIndex?: number;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  variant = 'default',
  size = 'md',
  disableBackdropClick = false,
  disableEscapeKey = false,
  showCloseButton = true,
  className = '',
  zIndex = 50,
}: ResponsiveModalProps) {
  const breakpoint = useBreakpoint();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // ════════════════════════════════════════════════════════════════
  // SCROLL LOCK
  // ════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isOpen) return;

    // Guardar scroll position
    const scrollY = window.scrollY;
    
    // Lock scroll
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      // Restaurar scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // ════════════════════════════════════════════════════════════════
  // FOCUS TRAP
  // ════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isOpen) return;

    // Guardar elemento activo anterior
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus en el modal
    if (modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      // Focus inicial
      firstElement?.focus();

      // Trap focus dentro del modal
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);

      return () => {
        document.removeEventListener('keydown', handleTab);
        // Restaurar focus
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen]);

  // ════════════════════════════════════════════════════════════════
  // ESCAPE KEY
  // ════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isOpen || disableEscapeKey) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, disableEscapeKey, onClose]);

  // ════════════════════════════════════════════════════════════════
  // BACKDROP CLICK
  // ════════════════════════════════════════════════════════════════

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (disableBackdropClick) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [disableBackdropClick, onClose]);

  // ════════════════════════════════════════════════════════════════
  // RENDER LOGIC
  // ════════════════════════════════════════════════════════════════

  if (!isOpen) return null;

  // Determinar variante según breakpoint
  const effectiveVariant = variant === 'default'
    ? (breakpoint === 'mobile' ? 'fullscreen' : breakpoint === 'tablet' ? 'drawer' : 'dialog')
    : variant;

  // Clases base
  const overlayClasses = `
    fixed inset-0 bg-black/50 backdrop-blur-sm
    transition-opacity duration-300
    ${isOpen ? 'opacity-100' : 'opacity-0'}
  `;

  // Estilos inline para z-index
  const overlayStyle = { zIndex };

  // Clases del contenedor según variante y breakpoint
  const containerClasses = getContainerClasses(effectiveVariant, size, breakpoint, isOpen);

  // ════════════════════════════════════════════════════════════════
  // MODAL CONTENT
  // ════════════════════════════════════════════════════════════════

  const modalContent = (
    <div
      className={overlayClasses}
      style={overlayStyle}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`${containerClasses} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* HEADER */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        
        {(title || showCloseButton) && (
          <div className="
            flex items-center justify-between
            px-4 py-3 border-b border-gray-200
            bg-white
            md:px-6 md:py-4
          ">
            {title && (
              <h2
                id="modal-title"
                className="text-responsive-h3 font-semibold text-gray-900"
              >
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  touch-target-large
                  touch-feedback
                  touch-no-select
                  flex items-center justify-center
                  rounded-lg
                  text-gray-400 hover:text-gray-600
                  hover:bg-gray-100
                  transition-colors
                  -mr-2
                "
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* BODY */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        
        <div className="
          flex-1 overflow-y-auto
          px-4 py-4
          md:px-6 md:py-5
          bg-white
        ">
          {children}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* FOOTER */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        
        {footer && (
          <div className="
            px-4 py-3 border-t border-gray-200
            bg-gray-50
            md:px-6 md:py-4
            flex flex-col gap-2
            sm:flex-row sm:justify-end
          ">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // PORTAL RENDER
  // ════════════════════════════════════════════════════════════════

  return createPortal(
    modalContent,
    document.body
  );
}

// ════════════════════════════════════════════════════════════════
// HELPER: Container Classes
// ════════════════════════════════════════════════════════════════

function getContainerClasses(
  variant: string,
  size: string,
  breakpoint: string,
  isOpen: boolean
): string {
  const baseClasses = `
    fixed bg-white
    flex flex-col
    shadow-2xl
    transition-all duration-300 ease-out
  `;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FULLSCREEN (Mobile)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (variant === 'fullscreen' || breakpoint === 'mobile') {
    return `
      ${baseClasses}
      inset-0
      rounded-none
      ${isOpen ? 'translate-y-0' : 'translate-y-full'}
    `;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DRAWER (Tablet)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (variant === 'drawer' || breakpoint === 'tablet') {
    return `
      ${baseClasses}
      right-0 top-0 bottom-0
      w-full max-w-md
      rounded-l-2xl
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    `;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DIALOG (Desktop)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
  }[size];

  return `
    ${baseClasses}
    top-1/2 left-1/2
    -translate-x-1/2 -translate-y-1/2
    w-full ${sizeClasses}
    max-h-[90vh]
    rounded-2xl
    ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
  `;
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export default ResponsiveModal;
