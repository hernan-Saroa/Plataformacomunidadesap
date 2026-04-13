/**
 * HOOK: useCommandPaletteState
 * 
 * Gestiona el estado del Command Palette:
 * - Historial de búsquedas
 * - Comandos favoritos
 * - Persistencia en localStorage
 */

import { useState, useEffect, useCallback } from 'react';

const RECENT_SEARCHES_KEY = 'esap-command-palette-recent';
const FAVORITES_KEY = 'esap-command-palette-favorites';
const MAX_RECENT = 10;
const MAX_FAVORITES = 20;

export function useCommandPaletteState() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Cargar desde localStorage al montar
  useEffect(() => {
    try {
      const savedRecent = localStorage.getItem(RECENT_SEARCHES_KEY);
      const savedFavorites = localStorage.getItem(FAVORITES_KEY);

      if (savedRecent) {
        setRecentSearches(JSON.parse(savedRecent));
      }
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error loading command palette state:', error);
    }
  }, []);

  // Agregar a recientes
  const addToRecent = useCallback((commandId: string) => {
    setRecentSearches(prev => {
      // Quitar si ya existe
      const filtered = prev.filter(id => id !== commandId);
      // Agregar al inicio
      const updated = [commandId, ...filtered].slice(0, MAX_RECENT);
      
      // Guardar en localStorage
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving recent searches:', error);
      }
      
      return updated;
    });
  }, []);

  // Toggle favorito
  const toggleFavorite = useCallback((commandId: string) => {
    setFavorites(prev => {
      let updated: string[];
      
      if (prev.includes(commandId)) {
        // Quitar de favoritos
        updated = prev.filter(id => id !== commandId);
      } else {
        // Agregar a favoritos (máximo MAX_FAVORITES)
        updated = [...prev, commandId].slice(0, MAX_FAVORITES);
      }
      
      // Guardar en localStorage
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving favorites:', error);
      }
      
      return updated;
    });
  }, []);

  // Limpiar recientes
  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  }, []);

  // Limpiar favoritos
  const clearFavorites = useCallback(() => {
    setFavorites([]);
    try {
      localStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Error clearing favorites:', error);
    }
  }, []);

  return {
    recentSearches,
    favorites,
    addToRecent,
    toggleFavorite,
    clearRecent,
    clearFavorites,
    isFavorite: (commandId: string) => favorites.includes(commandId),
    isRecent: (commandId: string) => recentSearches.includes(commandId),
  };
}
