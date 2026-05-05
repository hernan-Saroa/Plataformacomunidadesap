/**
 * Hook: useFirstVisit
 * Detecta si es la primera visita del usuario para mostrar onboarding, tours, etc.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'esap_first_visit';
const FEATURE_VISIT_PREFIX = 'esap_first_visit_';

/**
 * Hook para detectar primera visita global
 */
export const useFirstVisit = () => {
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return true;
    
    const visited = localStorage.getItem(STORAGE_KEY);
    return visited !== 'true';
  });

  const markAsVisited = useCallback(() => {
    setIsFirstVisit(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  }, []);

  const reset = useCallback(() => {
    setIsFirstVisit(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    // Si es la primera visita, marcar automáticamente después de un breve delay
    if (isFirstVisit) {
      const timer = setTimeout(() => {
        markAsVisited();
      }, 1000); // 1 segundo para dar tiempo a mostrar onboarding

      return () => clearTimeout(timer);
    }
  }, [isFirstVisit, markAsVisited]);

  return {
    isFirstVisit,
    markAsVisited,
    reset,
  };
};

/**
 * Hook para detectar primera visita a una feature específica
 */
export const useFirstFeatureVisit = (featureId: string) => {
  const storageKey = `${FEATURE_VISIT_PREFIX}${featureId}`;
  
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return true;
    
    const visited = localStorage.getItem(storageKey);
    return visited !== 'true';
  });

  const markAsVisited = useCallback(() => {
    setIsFirstVisit(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  const reset = useCallback(() => {
    setIsFirstVisit(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    isFirstVisit,
    markAsVisited,
    reset,
  };
};

/**
 * Resetea todas las primeras visitas (global y features)
 */
export const resetAllFirstVisits = (): void => {
  if (typeof window === 'undefined') return;
  
  // Resetear visita global
  localStorage.removeItem(STORAGE_KEY);
  
  // Resetear todas las visitas de features
  const keys = Object.keys(localStorage);
  const featureKeys = keys.filter(key => key.startsWith(FEATURE_VISIT_PREFIX));
  
  featureKeys.forEach(key => {
    localStorage.removeItem(key);
  });
};

/**
 * Verifica si es la primera visita sin usar el hook
 */
export const isFirstVisit = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  const visited = localStorage.getItem(STORAGE_KEY);
  return visited !== 'true';
};

/**
 * Verifica si es la primera visita a una feature específica
 */
export const isFirstFeatureVisit = (featureId: string): boolean => {
  if (typeof window === 'undefined') return true;
  
  const storageKey = `${FEATURE_VISIT_PREFIX}${featureId}`;
  const visited = localStorage.getItem(storageKey);
  return visited !== 'true';
};
