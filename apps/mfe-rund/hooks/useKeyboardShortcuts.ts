/**
 * useKeyboardShortcuts - Hook para shortcuts de teclado globales
 * Maneja atajos como ⌘K, ⌘P, ⌘N, etc.
 */

import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
        const metaMatch = shortcut.meta === undefined || shortcut.meta === event.metaKey;
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();

        if (ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          shortcut.callback();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

// Detectar si es Mac
export const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Formatear shortcut para mostrar
export function formatShortcut(shortcut: Omit<ShortcutConfig, 'callback'>): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  
  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}

// Shortcuts predefinidos comunes
export const SHORTCUTS = {
  COMMAND_PALETTE: {
    key: 'k',
    meta: !isMac ? false : true,
    ctrl: isMac ? false : true,
    description: 'Abrir buscador'
  },
  NUEVO_PTA: {
    key: 'n',
    meta: !isMac ? false : true,
    ctrl: isMac ? false : true,
    description: 'Nuevo PTA'
  },
  AGREGAR_ASIGNATURA: {
    key: 'a',
    meta: !isMac ? false : true,
    ctrl: isMac ? false : true,
    description: 'Agregar asignatura'
  },
  GUARDAR: {
    key: 's',
    meta: !isMac ? false : true,
    ctrl: isMac ? false : true,
    description: 'Guardar'
  },
  AYUDA: {
    key: '/',
    shift: true,
    description: 'Mostrar ayuda'
  }
};
