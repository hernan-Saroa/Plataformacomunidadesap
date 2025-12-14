/**
 * Accesibilidad ARIA - Utilities
 * Sistema completo de accesibilidad para cumplir WCAG 2.1 AA
 */

export interface AriaAttributes {
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-pressed'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-disabled'?: boolean;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
}

/**
 * Generar ID único para asociar labels y descriptions
 */
export const generateId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Crear atributos ARIA para botones interactivos
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
  return {
    'aria-label': label,
    'aria-pressed': options?.pressed,
    'aria-expanded': options?.expanded,
    'aria-controls': options?.controls,
    'aria-disabled': options?.disabled,
  };
};

/**
 * Crear atributos ARIA para inputs de formulario
 */
export const getInputAriaProps = (
  label: string,
  options?: {
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
    errorMessage?: string;
  }
): AriaAttributes & { 'aria-errormessage'?: string } => {
  return {
    'aria-label': label,
    'aria-required': options?.required,
    'aria-invalid': options?.invalid,
    'aria-describedby': options?.describedBy,
    'aria-errormessage': options?.errorMessage,
  };
};

/**
 * Crear atributos ARIA para regiones navegables
 */
export const getRegionAriaProps = (
  label: string,
  role: 'main' | 'navigation' | 'search' | 'complementary' | 'banner' | 'contentinfo' | 'region' = 'region'
): AriaAttributes => {
  return {
    role,
    'aria-label': label,
  };
};

/**
 * Crear atributos ARIA para elementos expandibles
 */
export const getExpandableAriaProps = (
  isExpanded: boolean,
  controls: string,
  label?: string
): AriaAttributes => {
  return {
    'aria-expanded': isExpanded,
    'aria-controls': controls,
    'aria-label': label,
  };
};

/**
 * Crear atributos ARIA para tabs
 */
export const getTabAriaProps = (
  isSelected: boolean,
  controls: string,
  index: number
): AriaAttributes => {
  return {
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': controls,
    tabIndex: isSelected ? 0 : -1,
  } as any;
};

/**
 * Crear atributos ARIA para modal/dialog
 */
export const getDialogAriaProps = (
  label: string,
  describedBy?: string
): AriaAttributes => {
  return {
    role: 'dialog',
    'aria-modal': true,
    'aria-label': label,
    'aria-describedby': describedBy,
  } as any;
};

/**
 * Crear atributos ARIA para live regions (notificaciones)
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
 * Anunciar mensaje a lectores de pantalla
 */
export const announceToScreenReader = (
  message: string,
  level: 'polite' | 'assertive' = 'polite'
) => {
  if (typeof document === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', level);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Trap focus dentro de un elemento (para modales)
 */
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Focus primer elemento
  firstElement?.focus();

  // Retornar función cleanup
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Obtener todos los elementos focusables dentro de un contenedor
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector));
};

/**
 * Mover focus al siguiente elemento focusable
 */
export const focusNextElement = (currentElement: HTMLElement, container?: HTMLElement) => {
  const root = container || document.body;
  const focusable = getFocusableElements(root);
  const currentIndex = focusable.indexOf(currentElement);
  const nextIndex = (currentIndex + 1) % focusable.length;
  focusable[nextIndex]?.focus();
};

/**
 * Mover focus al elemento anterior focusable
 */
export const focusPreviousElement = (currentElement: HTMLElement, container?: HTMLElement) => {
  const root = container || document.body;
  const focusable = getFocusableElements(root);
  const currentIndex = focusable.indexOf(currentElement);
  const prevIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
  focusable[prevIndex]?.focus();
};

/**
 * Verificar si elemento está visible en viewport
 */
export const isElementVisible = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Scroll suave hacia elemento con focus
 */
export const scrollToElement = (element: HTMLElement, behavior: ScrollBehavior = 'smooth') => {
  if (!isElementVisible(element)) {
    element.scrollIntoView({ behavior, block: 'center' });
  }
};

/**
 * Keyboard navigation map
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * Detectar si usuario está navegando con teclado
 */
export const detectKeyboardNavigation = (): (() => void) => {
  let isUsingKeyboard = false;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      isUsingKeyboard = true;
      document.body.classList.add('keyboard-navigation');
    }
  };

  const handleMouseDown = () => {
    isUsingKeyboard = false;
    document.body.classList.remove('keyboard-navigation');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleMouseDown);
  };
};
