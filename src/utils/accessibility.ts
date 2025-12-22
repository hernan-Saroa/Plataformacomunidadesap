/**
 * Utilidades de Accesibilidad ARIA y WCAG 2.1
 * Funciones para mejorar la accesibilidad de la aplicación
 */

export type AriaAttributes = {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-haspopup'?: boolean | 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid';
  'aria-pressed'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
  'aria-busy'?: boolean;
  role?: string;
};

/**
 * Constantes de teclas para navegación
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

let idCounter = 0;

/**
 * Genera un ID único para elementos ARIA
 */
export const generateId = (prefix: string = 'aria'): string => {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
};

/**
 * Props ARIA para botones
 */
export const getButtonAriaProps = (
  label: string,
  options?: {
    pressed?: boolean;
    expanded?: boolean;
    controls?: string;
    disabled?: boolean;
  }
): AriaAttributes => {
  const props: AriaAttributes = {
    'aria-label': label,
  };

  if (options?.pressed !== undefined) {
    props['aria-pressed'] = options.pressed;
  }

  if (options?.expanded !== undefined) {
    props['aria-expanded'] = options.expanded;
  }

  if (options?.controls) {
    props['aria-controls'] = options.controls;
  }

  if (options?.disabled) {
    props['aria-disabled'] = options.disabled;
  }

  return props;
};

/**
 * Props ARIA para inputs
 */
export const getInputAriaProps = (
  label: string,
  options?: {
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
  }
): AriaAttributes => {
  const props: AriaAttributes = {
    'aria-label': label,
  };

  if (options?.describedBy) {
    props['aria-describedby'] = options.describedBy;
  }

  return props;
};

/**
 * Props ARIA para regiones/secciones
 */
export const getRegionAriaProps = (
  label: string,
  options?: {
    labelledBy?: string;
  }
): AriaAttributes => {
  const props: AriaAttributes = {
    role: 'region',
  };

  if (options?.labelledBy) {
    props['aria-labelledby'] = options.labelledBy;
  } else {
    props['aria-label'] = label;
  }

  return props;
};

/**
 * Props ARIA para elementos expandibles
 */
export const getExpandableAriaProps = (
  expanded: boolean,
  controlsId: string
): AriaAttributes => {
  return {
    'aria-expanded': expanded,
    'aria-controls': controlsId,
  };
};

/**
 * Props ARIA para tabs
 */
export const getTabAriaProps = (
  selected: boolean,
  controlsId: string,
  tabId: string
): AriaAttributes => {
  return {
    role: 'tab',
    'aria-selected': selected,
    'aria-controls': controlsId,
    id: tabId,
  } as AriaAttributes & { id: string };
};

/**
 * Props ARIA para diálogos/modales
 */
export const getDialogAriaProps = (
  label: string,
  describedBy?: string
): AriaAttributes => {
  const props: AriaAttributes = {
    role: 'dialog',
    'aria-modal': true,
    'aria-label': label,
  } as AriaAttributes & { 'aria-modal': boolean };

  if (describedBy) {
    props['aria-describedby'] = describedBy;
  }

  return props;
};

/**
 * Props ARIA para regiones live (anuncios dinámicos)
 */
export const getLiveRegionAriaProps = (
  level: 'polite' | 'assertive' = 'polite'
): AriaAttributes => {
  return {
    role: 'status',
    'aria-live': level,
    'aria-atomic': true,
  };
};

/**
 * Anuncia un mensaje a lectores de pantalla
 */
export const announceToScreenReader = (
  message: string,
  level: 'polite' | 'assertive' = 'polite'
): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', level);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remover después de que se anuncie
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Trap focus dentro de un elemento (para modales)
 */
export const trapFocus = (element: HTMLElement): (() => void) => {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Focus primer elemento
  firstFocusable?.focus();

  // Cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Detecta si el usuario está navegando con teclado
 */
export const detectKeyboardNavigation = (): (() => void) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  };

  const handleMouseDown = () => {
    document.body.classList.remove('keyboard-navigation');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);

  // Cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown);
  };
};

/**
 * Obtiene todos los elementos focusables dentro de un contenedor
 */
export const getFocusableElements = (
  container: HTMLElement
): HTMLElement[] => {
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
};

/**
 * Mueve el focus al siguiente elemento focusable
 */
export const focusNextElement = (currentElement: HTMLElement): void => {
  const focusableElements = getFocusableElements(document.body);
  const currentIndex = focusableElements.indexOf(currentElement);
  
  if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
    focusableElements[currentIndex + 1].focus();
  }
};

/**
 * Mueve el focus al elemento anterior focusable
 */
export const focusPreviousElement = (currentElement: HTMLElement): void => {
  const focusableElements = getFocusableElements(document.body);
  const currentIndex = focusableElements.indexOf(currentElement);
  
  if (currentIndex > 0) {
    focusableElements[currentIndex - 1].focus();
  }
};

/**
 * Hace scroll suave a un elemento
 */
export const scrollToElement = (element: HTMLElement, options?: ScrollIntoViewOptions): void => {
  if (!element) return;
  
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
    ...options,
  });
};