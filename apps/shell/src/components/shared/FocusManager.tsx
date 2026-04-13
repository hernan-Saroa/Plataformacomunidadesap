/**
 * FocusManager Component
 * Gestiona el focus y focus trap para modales y elementos interactivos
 */

import { useEffect, useRef } from 'react';
import { useFocusTrap, useFocusRestoration } from '../../hooks/useAccessibility';

interface FocusManagerProps {
  children: React.ReactNode;
  isActive: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  onEscape?: () => void;
  className?: string;
}

export function FocusManager({
  children,
  isActive,
  restoreFocus = true,
  autoFocus = true,
  onEscape,
  className = '',
}: FocusManagerProps) {
  const containerRef = useFocusTrap(isActive);
  const { saveFocus, restoreFocus: restoreFocusFn } = useFocusRestoration();
  const initialFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // Guardar focus actual
      if (restoreFocus) {
        saveFocus();
      }

      // Auto-focus en primer elemento focusable
      if (autoFocus && containerRef.current) {
        setTimeout(() => {
          const firstFocusable = containerRef.current?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }, 10);
      }
    } else {
      // Restaurar focus al cerrar
      if (restoreFocus) {
        restoreFocusFn();
      }
    }
  }, [isActive, autoFocus, restoreFocus, saveFocus, restoreFocusFn]);

  // Manejar Escape key
  useEffect(() => {
    if (!isActive || !onEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);

  return (
    <div
      ref={containerRef as any}
      className={className}
      role="region"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
