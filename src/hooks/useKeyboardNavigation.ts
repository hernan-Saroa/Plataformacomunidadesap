/**
 * Hook: useKeyboardNavigation
 * Sistema extendido de navegación por teclado sin tocar pantalla
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  KEYBOARD_KEYS,
  focusNextElement,
  focusPreviousElement,
  scrollToElement,
  announceToScreenReader,
} from '../utils/accessibility';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean; // Cmd en Mac, Win en Windows
  description: string;
  action: () => void;
  global?: boolean; // Si true, funciona en toda la app
}

export const useKeyboardNavigation = (shortcuts: KeyboardShortcut[] = []) => {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  /**
   * Manejar atajos de teclado
   */
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    const activeShortcuts = shortcutsRef.current;

    for (const shortcut of activeShortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
        event.preventDefault();
        shortcut.action();
        announceToScreenReader(`Atajo activado: ${shortcut.description}`, 'polite');
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  /**
   * Navegación por arrows en listas/grids
   */
  const handleArrowNavigation = useCallback((
    event: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (newIndex: number) => void,
    orientation: 'vertical' | 'horizontal' | 'grid' = 'vertical'
  ) => {
    const { key } = event;

    let newIndex = currentIndex;

    if (orientation === 'vertical') {
      if (key === KEYBOARD_KEYS.ARROW_DOWN) {
        newIndex = Math.min(currentIndex + 1, items.length - 1);
      } else if (key === KEYBOARD_KEYS.ARROW_UP) {
        newIndex = Math.max(currentIndex - 1, 0);
      }
    } else if (orientation === 'horizontal') {
      if (key === KEYBOARD_KEYS.ARROW_RIGHT) {
        newIndex = Math.min(currentIndex + 1, items.length - 1);
      } else if (key === KEYBOARD_KEYS.ARROW_LEFT) {
        newIndex = Math.max(currentIndex - 1, 0);
      }
    } else if (orientation === 'grid') {
      // Grid navigation (ejemplo: 3 columnas)
      const columns = 3;
      if (key === KEYBOARD_KEYS.ARROW_DOWN) {
        newIndex = Math.min(currentIndex + columns, items.length - 1);
      } else if (key === KEYBOARD_KEYS.ARROW_UP) {
        newIndex = Math.max(currentIndex - columns, 0);
      } else if (key === KEYBOARD_KEYS.ARROW_RIGHT) {
        newIndex = Math.min(currentIndex + 1, items.length - 1);
      } else if (key === KEYBOARD_KEYS.ARROW_LEFT) {
        newIndex = Math.max(currentIndex - 1, 0);
      }
    }

    // Home/End keys
    if (key === KEYBOARD_KEYS.HOME) {
      newIndex = 0;
    } else if (key === KEYBOARD_KEYS.END) {
      newIndex = items.length - 1;
    }

    if (newIndex !== currentIndex) {
      event.preventDefault();
      onIndexChange(newIndex);
      items[newIndex]?.focus();
      scrollToElement(items[newIndex]);
    }
  }, []);

  /**
   * Manejar Tab navigation con trap
   */
  const handleTabNavigation = useCallback((
    event: React.KeyboardEvent,
    container: HTMLElement
  ) => {
    if (event.key !== KEYBOARD_KEYS.TAB) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  /**
   * Escape para cerrar modales/dropdowns
   */
  const handleEscape = useCallback((onClose: () => void) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYBOARD_KEYS.ESCAPE) {
        event.preventDefault();
        onClose();
        announceToScreenReader('Modal cerrado', 'polite');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Enter/Space para activar elementos
   */
  const handleActivation = useCallback((
    event: React.KeyboardEvent,
    callback: () => void
  ) => {
    if (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) {
      event.preventDefault();
      callback();
    }
  }, []);

  /**
   * Skip to main content
   */
  const skipToContent = useCallback((targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      scrollToElement(target);
      announceToScreenReader('Navegado a contenido principal', 'polite');
    }
  }, []);

  /**
   * Navegación por landmarks (main, nav, complementary, etc)
   */
  const navigateLandmarks = useCallback((direction: 'next' | 'prev') => {
    const landmarks = document.querySelectorAll<HTMLElement>(
      '[role="main"], [role="navigation"], [role="complementary"], [role="banner"], [role="contentinfo"], main, nav, aside, header, footer'
    );

    const landmarksArray = Array.from(landmarks);
    const currentIndex = landmarksArray.indexOf(document.activeElement as HTMLElement);
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = currentIndex < landmarksArray.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : landmarksArray.length - 1;
    }

    const target = landmarksArray[newIndex];
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      scrollToElement(target);
      announceToScreenReader(`Navegado a ${target.getAttribute('aria-label') || target.tagName}`, 'polite');
    }
  }, []);

  return {
    handleArrowNavigation,
    handleTabNavigation,
    handleEscape,
    handleActivation,
    skipToContent,
    navigateLandmarks,
  };
};

/**
 * Atajos globales predefinidos para La Comunidad ESAP
 */
export const ESAP_GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'k',
    meta: true,
    description: 'Abrir búsqueda global',
    action: () => {
      const searchButton = document.querySelector('[data-shortcut="search"]') as HTMLElement;
      searchButton?.click();
    },
    global: true,
  },
  {
    key: '/',
    description: 'Enfocar búsqueda',
    action: () => {
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      searchInput?.focus();
    },
    global: true,
  },
  {
    key: 'h',
    shift: true,
    description: 'Ir a inicio',
    action: () => {
      window.location.hash = '#/portal';
    },
    global: true,
  },
  {
    key: 'p',
    shift: true,
    description: 'Abrir perfil',
    action: () => {
      const profileButton = document.querySelector('[data-shortcut="profile"]') as HTMLElement;
      profileButton?.click();
    },
    global: true,
  },
  {
    key: 'n',
    shift: true,
    description: 'Ver notificaciones',
    action: () => {
      const notificationsButton = document.querySelector('[data-shortcut="notifications"]') as HTMLElement;
      notificationsButton?.click();
    },
    global: true,
  },
  {
    key: 'm',
    shift: true,
    description: 'Abrir menú principal',
    action: () => {
      const menuButton = document.querySelector('[data-shortcut="menu"]') as HTMLElement;
      menuButton?.click();
    },
    global: true,
  },
  {
    key: '?',
    shift: true,
    description: 'Mostrar atajos de teclado',
    action: () => {
      const helpButton = document.querySelector('[data-shortcut="help"]') as HTMLElement;
      helpButton?.click();
    },
    global: true,
  },
];
