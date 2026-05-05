/**
 * Hook: useAccessibility
 * Sistema completo de accesibilidad ARIA para ESAP
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// UTILIDADES
// ============================================

let idCounter = 0;

const generateId = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
};

// ============================================
// HOOK PRINCIPAL: useAccessibility
// ============================================

/**
 * Hook principal de accesibilidad
 * Proporciona props ARIA básicas para cualquier componente
 */
export const useAccessibility = (options: {
  label?: string;
  description?: string;
  role?: string;
  live?: 'off' | 'polite' | 'assertive';
} = {}) => {
  const { label, description, role, live } = options;
  
  const [labelId] = useState(() => label ? generateId('label') : undefined);
  const [descId] = useState(() => description ? generateId('desc') : undefined);

  const ariaProps = {
    role,
    'aria-label': label,
    'aria-labelledby': labelId,
    'aria-describedby': descId,
    'aria-live': live,
  };

  // Filtrar props undefined
  const filteredAriaProps = Object.fromEntries(
    Object.entries(ariaProps).filter(([_, value]) => value !== undefined)
  );

  return {
    ariaProps: filteredAriaProps,
    labelId,
    descId,
  };
};

// ============================================
// useFocusTrap
// ============================================

/**
 * Hook para atrapar el foco dentro de un contenedor (modales, diálogos)
 */
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
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

    container.addEventListener('keydown', handleTabKey);

    // Enfocar el primer elemento al activar
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

// ============================================
// useFocusRestoration
// ============================================

/**
 * Hook para restaurar el foco cuando se cierra un modal/diálogo
 */
export const useFocusRestoration = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
};

// ============================================
// useLiveAnnouncements
// ============================================

/**
 * Hook para anuncios en vivo (screen readers)
 */
export const useLiveAnnouncements = () => {
  const [announcement, setAnnouncement] = useState('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    // Limpiar anuncio anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setPoliteness(priority);
    setAnnouncement(message);

    // Limpiar después de un tiempo
    timeoutRef.current = setTimeout(() => {
      setAnnouncement('');
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    announcement,
    politeness,
    announce,
  };
};

// ============================================
// useAriaDescription
// ============================================

/**
 * Hook para gestionar descripción de elementos
 */
export const useAriaDescription = (description: string) => {
  const [id] = useState(() => generateId('desc'));

  const ariaDescribedBy = description ? id : undefined;

  return { 
    descriptionId: id,
    ariaDescribedBy,
    hasDescription: !!description 
  };
};

// ============================================
// useAriaExpanded
// ============================================

/**
 * Hook para gestionar expansión de elementos (acordeones, dropdowns)
 */
export const useAriaExpanded = (initialState: boolean = false) => {
  const [isExpanded, setIsExpanded] = useState(initialState);
  const [buttonId] = useState(() => generateId('toggle'));
  const [contentId] = useState(() => generateId('content'));

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const buttonProps = {
    id: buttonId,
    'aria-expanded': isExpanded,
    'aria-controls': contentId,
  };

  const contentProps = {
    id: contentId,
    'aria-labelledby': buttonId,
    hidden: !isExpanded,
  };

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    buttonProps,
    contentProps,
  };
};

// ============================================
// useAriaLabel
// ============================================

/**
 * Hook para gestionar etiquetas ARIA
 */
export const useAriaLabel = (label: string, description?: string) => {
  const [labelId] = useState(() => generateId('label'));
  const [descId] = useState(() => description ? generateId('desc') : undefined);

  const ariaProps = {
    'aria-labelledby': labelId,
    'aria-describedby': descId,
  };

  return {
    labelId,
    descId,
    ariaProps,
  };
};

// ============================================
// useAriaInvalid
// ============================================

/**
 * Hook para gestionar estados de validación
 */
export const useAriaInvalid = (isInvalid: boolean, errorMessage?: string) => {
  const [errorId] = useState(() => generateId('error'));

  const ariaProps = {
    'aria-invalid': isInvalid,
    'aria-describedby': isInvalid && errorMessage ? errorId : undefined,
  };

  return {
    errorId,
    ariaProps,
  };
};

// ============================================
// useKeyboardHandler
// ============================================

/**
 * Hook para manejar eventos de teclado de forma accesible
 */
export const useKeyboardHandler = (
  onEnter?: () => void,
  onEscape?: () => void,
  onSpace?: () => void
) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (onEnter) {
            e.preventDefault();
            onEnter();
          }
          break;
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
        case ' ':
        case 'Space':
          if (onSpace) {
            e.preventDefault();
            onSpace();
          }
          break;
      }
    },
    [onEnter, onEscape, onSpace]
  );

  return { handleKeyDown };
};

// ============================================
// useSkipLink
// ============================================

/**
 * Hook para enlaces de salto (skip to content)
 */
export const useSkipLink = (targetId: string) => {
  const skipToContent = useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [targetId]);

  return { skipToContent };
};

// ============================================
// useScreenReaderOnly
// ============================================

/**
 * Hook para contenido visible solo para lectores de pantalla
 */
export const useScreenReaderOnly = () => {
  const srOnlyClass = 'sr-only';
  
  return {
    srOnlyClass,
    srOnlyStyle: {
      position: 'absolute' as const,
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap' as const,
      borderWidth: '0',
    },
  };
};
