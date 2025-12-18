/**
 * Hook: useAccessibility
 * Sistema completo de accesibilidad ARIA y gestión de focus
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  generateId,
  getButtonAriaProps,
  getInputAriaProps,
  getRegionAriaProps,
  getExpandableAriaProps,
  getTabAriaProps,
  getDialogAriaProps,
  getLiveRegionAriaProps,
  announceToScreenReader,
  trapFocus,
  detectKeyboardNavigation,
  AriaAttributes,
} from '../utils/accessibility';

export const useAccessibility = () => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    // Detectar si usuario navega con teclado
    const cleanup = detectKeyboardNavigation();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      cleanup();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  /**
   * Generar props ARIA para diferentes tipos de componentes
   */
  const ariaProps = {
    button: getButtonAriaProps,
    input: getInputAriaProps,
    region: getRegionAriaProps,
    expandable: getExpandableAriaProps,
    tab: getTabAriaProps,
    dialog: getDialogAriaProps,
    liveRegion: getLiveRegionAriaProps,
  };

  /**
   * Anunciar mensaje
   */
  const announce = useCallback((message: string, level: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, level);
  }, []);

  /**
   * Generar ID único
   */
  const createId = useCallback((prefix: string) => {
    return generateId(prefix);
  }, []);

  return {
    isKeyboardUser,
    ariaProps,
    announce,
    createId,
  };
};

/**
 * Hook para gestionar focus trap (modales, dropdowns)
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const cleanup = trapFocus(containerRef.current);
    return cleanup;
  }, [isActive]);

  return containerRef;
};

/**
 * Hook para gestionar focus restoration
 * Útil para modales que deben restaurar focus al elemento que los abrió
 */
export const useFocusRestoration = () => {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    previousActiveElementRef.current?.focus();
    previousActiveElementRef.current = null;
  }, []);

  return { saveFocus, restoreFocus };
};

/**
 * Hook para anuncios de estado en vivo
 * Útil para notificaciones, mensajes de error, confirmaciones
 */
export const useLiveAnnouncements = () => {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((message: string, level: 'polite' | 'assertive' = 'polite', duration: number = 3000) => {
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setAnnouncement(''); // Reset para forzar re-anuncio

    // Pequeño delay para asegurar que el cambio se detecte
    setTimeout(() => {
      setAnnouncement(message);
      announceToScreenReader(message, level);
    }, 10);

    // Auto-limpiar después de duración
    timeoutRef.current = setTimeout(() => {
      setAnnouncement('');
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { announcement, announce };
};

/**
 * Hook para gestionar descripción de elementos
 */
export const useAriaDescription = (description: string) => {
  const [id] = useState(() => generateId('desc'));

  const descriptionElement = description ? (
    <span id={id} className="sr-only">
      {description}
    </span>
  ) : null;

  const ariaDescribedBy = description ? id : undefined;

  return { descriptionElement, ariaDescribedBy };
};

/**
 * Hook para gestionar expansión de elementos (acordeones, dropdowns)
 */
export const useAriaExpanded = (initialState: boolean = false) => {
  const [isExpanded, setIsExpanded] = useState(initialState);
  const [contentId] = useState(() => generateId('content'));
  const [triggerId] = useState(() => generateId('trigger'));

  const toggle = useCallback(() => {
    setIsExpanded(prev => {
      const newState = !prev;
      announceToScreenReader(
        newState ? 'Expandido' : 'Contraído',
        'polite'
      );
      return newState;
    });
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
    announceToScreenReader('Expandido', 'polite');
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
    announceToScreenReader('Contraído', 'polite');
  }, []);

  const triggerProps: AriaAttributes = {
    'aria-expanded': isExpanded,
    'aria-controls': contentId,
  };

  const contentProps: AriaAttributes & { id: string } = {
    id: contentId,
    role: 'region',
    'aria-labelledby': triggerId,
  };

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    triggerProps,
    contentProps,
    contentId,
    triggerId,
  };
};
