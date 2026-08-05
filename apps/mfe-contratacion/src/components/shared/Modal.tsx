import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal con los tamaños estandarizados del design system (ModalSIGL):
 *   small  448px · confirmaciones
 *   medium 672px · formularios simples
 *   large  896px · formularios complejos
 *   xlarge 1024px · tablas y listas
 *   full   1152px · expedientes completos
 */
type Tamano = 'small' | 'medium' | 'large' | 'xlarge' | 'full';

const ANCHOS: Record<Tamano, string> = {
  small: 'max-w-[95vw] sm:max-w-md',
  medium: 'max-w-[95vw] sm:max-w-2xl',
  large: 'max-w-[95vw] sm:max-w-4xl',
  xlarge: 'max-w-[95vw] sm:max-w-5xl',
  full: 'max-w-[98vw] sm:max-w-6xl',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: Tamano;
  icon?: ReactNode;
  color?: string;
  footer?: ReactNode;
  /** El contenido gestiona su propio scroll y padding (p. ej. con columna lateral). */
  sinPadding?: boolean;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'medium',
  icon,
  color = '#003DA5',
  footer,
  sinPadding = false,
  children,
}: Props) {
  // Escape cierra, y el fondo no debe scrollear mientras el modal está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', alPresionar);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={`relative w-full ${ANCHOS[size]} max-h-[85vh] bg-white rounded-xl
          shadow-2xl overflow-hidden flex flex-col`}
      >
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-start gap-3 flex-shrink-0">
          {icon && (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: color }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="modal-titulo" className="text-base font-black text-gray-900 m-0 leading-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-gray-500 m-0 mt-0.5 leading-snug">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`flex-1 min-h-0 ${sinPadding ? 'flex overflow-hidden' : 'overflow-y-auto px-5 py-4'}`}>
          {children}
        </div>

        {footer && (
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center gap-2 flex-wrap flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
