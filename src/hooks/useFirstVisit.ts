import { useState, useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'esap-first-visit-';

/**
 * Hook para detectar si es la primera visita del usuario a una sección específica
 * 
 * @param key - Identificador único de la sección (ej: 'app', 'users-module', 'reports')
 * @returns { isFirstVisit, isLoading, markAsVisited }
 * 
 * @example
 * const { isFirstVisit, markAsVisited } = useFirstVisit('users-module');
 * 
 * {isFirstVisit && (
 *   <InlineTip 
 *     title="Bienvenido"
 *     message="Esta es la sección de usuarios..."
 *     onDismiss={markAsVisited}
 *   />
 * )}
 */
export function useFirstVisit(key: string) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${key}`;
    const hasVisited = localStorage.getItem(storageKey);
    
    setIsFirstVisit(!hasVisited);
    setIsLoading(false);
  }, [key]);

  const markAsVisited = () => {
    const storageKey = `${STORAGE_KEY_PREFIX}${key}`;
    localStorage.setItem(storageKey, 'true');
    setIsFirstVisit(false);
  };

  return { isFirstVisit, isLoading, markAsVisited };
}
