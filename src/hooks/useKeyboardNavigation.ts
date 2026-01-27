/**
 * HOOK: useKeyboardNavigation
 * Sistema completo de navegación por teclado para módulos administrativos
 * 
 * Atajos disponibles:
 * - ←/→: Navegar entre secciones (anterior/siguiente)
 * - Tab: Navegación estándar entre elementos
 * - Enter/Space: Activar botón enfocado
 * - Escape: Cerrar drawer mobile
 * - Ctrl/Cmd + 1-9: Acceso directo a secciones por número
 * - Ctrl/Cmd + M: Abrir/cerrar menú mobile
 * - Alt + ↑: Primera sección
 * - Alt + ↓: Última sección
 */

import { useEffect, useCallback } from 'react';

// Definición de atajos globales de ESAP
export const ESAP_GLOBAL_SHORTCUTS = [
  { key: 'Ctrl/Cmd + K', description: 'Abrir búsqueda global', action: 'search' },
  { key: 'Ctrl/Cmd + /', description: 'Ver todos los atajos', action: 'shortcuts' },
  { key: 'Ctrl/Cmd + M', description: 'Abrir/cerrar menú', action: 'menu' },
  { key: 'Ctrl/Cmd + 1-9', description: 'Ir a sección específica', action: 'navigate' },
  { key: '←/→', description: 'Navegar entre secciones', action: 'navigate' },
  { key: 'Alt + ↑/↓', description: 'Primera/última sección', action: 'navigate' },
  { key: 'Escape', description: 'Cerrar modal/menú', action: 'close' },
] as const;

interface MenuItem {
  id: string;
  label: string;
  [key: string]: any;
}

interface UseKeyboardNavigationProps {
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  isMobile?: boolean;
}

export function useKeyboardNavigation({
  menuItems,
  activeSection,
  onSectionChange,
  mobileMenuOpen,
  setMobileMenuOpen,
  isMobile
}: UseKeyboardNavigationProps) {

  // Navegar a la siguiente sección
  const navigateNext = useCallback(() => {
    const currentIndex = menuItems.findIndex(item => item.id === activeSection);
    const nextIndex = (currentIndex + 1) % menuItems.length;
    onSectionChange(menuItems[nextIndex].id);
  }, [menuItems, activeSection, onSectionChange]);

  // Navegar a la sección anterior
  const navigatePrevious = useCallback(() => {
    const currentIndex = menuItems.findIndex(item => item.id === activeSection);
    const prevIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
    onSectionChange(menuItems[prevIndex].id);
  }, [menuItems, activeSection, onSectionChange]);

  // Navegar por índice numérico (1-9)
  const navigateByNumber = useCallback((num: number) => {
    if (num >= 1 && num <= menuItems.length) {
      onSectionChange(menuItems[num - 1].id);
    }
  }, [menuItems, onSectionChange]);

  // Toggle del menú mobile
  const toggleMobileMenu = useCallback(() => {
    if (setMobileMenuOpen && isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    }
  }, [mobileMenuOpen, setMobileMenuOpen, isMobile]);

  // Cerrar menú mobile
  const closeMobileMenu = useCallback(() => {
    if (setMobileMenuOpen && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileMenuOpen, setMobileMenuOpen]);

  // Handler principal de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // ESCAPE - Cerrar drawer mobile
      if (e.key === 'Escape') {
        closeMobileMenu();
        return;
      }

      // CTRL/CMD + M - Toggle menú mobile
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        toggleMobileMenu();
        return;
      }

      // CTRL/CMD + Número (1-9) - Acceso directo a secciones
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const num = parseInt(e.key);
        navigateByNumber(num);
        return;
      }

      // FLECHA DERECHA - Siguiente sección
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Solo si no hay modales abiertos
        const hasOpenModal = document.querySelector('[role="dialog"]');
        if (!hasOpenModal) {
          e.preventDefault();
          navigateNext();
        }
        return;
      }

      // FLECHA IZQUIERDA - Sección anterior
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Solo si no hay modales abiertos
        const hasOpenModal = document.querySelector('[role="dialog"]');
        if (!hasOpenModal) {
          e.preventDefault();
          navigatePrevious();
        }
        return;
      }

      // ALT + FLECHA ARRIBA - Primera sección
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        onSectionChange(menuItems[0].id);
        return;
      }

      // ALT + FLECHA ABAJO - Última sección
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        onSectionChange(menuItems[menuItems.length - 1].id);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    menuItems,
    activeSection,
    navigateNext,
    navigatePrevious,
    navigateByNumber,
    toggleMobileMenu,
    closeMobileMenu,
    onSectionChange
  ]);

  return {
    navigateNext,
    navigatePrevious,
    navigateByNumber,
    toggleMobileMenu,
    closeMobileMenu
  };
}