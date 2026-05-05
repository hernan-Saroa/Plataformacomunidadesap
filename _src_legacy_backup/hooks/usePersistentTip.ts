/**
 * Hook: usePersistentTip
 * Sistema de tips contextuales persistentes que el usuario puede ocultar
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_PREFIX = 'esap_hidden_tip_';

/**
 * Hook para gestionar tips persistentes
 */
export const usePersistentTip = (tipId: string, defaultVisible: boolean = true) => {
  const storageKey = `${STORAGE_PREFIX}${tipId}`;
  
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return defaultVisible;
    
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return defaultVisible;
    
    return stored !== 'true'; // Si está en 'true', significa que está oculto
  });

  const hide = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  const show = useCallback(() => {
    setIsVisible(true);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const toggle = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, hide, show]);

  return {
    isVisible,
    hide,
    show,
    toggle,
  };
};

/**
 * Resetea todos los tips ocultos
 */
export const resetAllTips = (): void => {
  if (typeof window === 'undefined') return;
  
  const keys = Object.keys(localStorage);
  const tipKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
  
  tipKeys.forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Obtiene el conteo de tips ocultos
 */
export const getHiddenTipsCount = (): number => {
  if (typeof window === 'undefined') return 0;
  
  const keys = Object.keys(localStorage);
  const tipKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
  
  return tipKeys.length;
};

/**
 * Verifica si un tip específico está oculto
 */
export const isTipHidden = (tipId: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  const storageKey = `${STORAGE_PREFIX}${tipId}`;
  return localStorage.getItem(storageKey) === 'true';
};

/**
 * Oculta un tip específico sin usar el hook
 */
export const hideTip = (tipId: string): void => {
  if (typeof window === 'undefined') return;
  
  const storageKey = `${STORAGE_PREFIX}${tipId}`;
  localStorage.setItem(storageKey, 'true');
};

/**
 * Muestra un tip específico sin usar el hook
 */
export const showTip = (tipId: string): void => {
  if (typeof window === 'undefined') return;
  
  const storageKey = `${STORAGE_PREFIX}${tipId}`;
  localStorage.removeItem(storageKey);
};
