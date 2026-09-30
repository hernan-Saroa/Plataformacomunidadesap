/**
 * useKeyboardVisible - Hook para detectar teclado virtual en iOS/Android
 * ✅ Soluciona problema de modales cubiertos por teclado
 * ✅ Compatible con iOS visualViewport API
 * ✅ Fallback para navegadores antiguos
 */

import { useState, useEffect } from 'react';

export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // Verificar si visualViewport está disponible (iOS Safari, Chrome)
    if (!window.visualViewport) {
      console.warn('visualViewport API no disponible en este navegador');
      return;
    }

    const handleResize = () => {
      const viewportHeight = window.visualViewport!.height;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;
      
      // Si la diferencia de altura es mayor al 25% de la altura original,
      // asumimos que el teclado está visible
      const threshold = windowHeight * 0.25;
      const keyboardIsVisible = heightDiff > threshold;
      
      setKeyboardVisible(keyboardIsVisible);
    };

    // Listener para cambios en el viewport
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    
    // Check inicial
    handleResize();
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  return isKeyboardVisible;
}

// Hook alternativo usando eventos de focus/blur en inputs
export function useKeyboardVisibleFallback(): boolean {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Pequeño delay para dar tiempo a que el teclado aparezca
        setTimeout(() => setKeyboardVisible(true), 300);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        setTimeout(() => setKeyboardVisible(false), 300);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return isKeyboardVisible;
}

// Hook combinado que usa el mejor método disponible
export function useKeyboardVisibleSmart(): boolean {
  const vvKeyboard = useKeyboardVisible();
  const fallbackKeyboard = useKeyboardVisibleFallback();
  
  // Preferir visualViewport si está disponible, sino usar fallback
  return window.visualViewport ? vvKeyboard : fallbackKeyboard;
}
