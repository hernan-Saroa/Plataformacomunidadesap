/**
 * COMPONENTE: SAVED VIEWS MANAGER
 * 
 * Gestor de vistas guardadas estilo Notion/Airtable:
 * - Crear vistas personalizadas
 * - Guardar configuración de columnas
 * - Guardar filtros y ordenamiento
 * - Marcar favoritas
 * - Persistencia en localStorage
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Check,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';

export interface SavedView {
  id: string;
  name: string;
  isDefault?: boolean;
  isFavorite?: boolean;
  columns: string[];
  sortBy?: { columnId: string; direction: 'asc' | 'desc' }[];
  filters?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface SavedViewsManagerProps {
  views: SavedView[];
  currentViewId?: string;
  onViewSelect: (view: SavedView) => void;
  onViewCreate: (view: Omit<SavedView, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onViewUpdate: (viewId: string, updates: Partial<SavedView>) => void;
  onViewDelete: (viewId: string) => void;
  storageKey?: string;
}

export function SavedViewsManager({
  views: initialViews,
  currentViewId,
  onViewSelect,
  onViewCreate,
  onViewUpdate,
  onViewDelete,
  storageKey = 'datatable-views',
}: SavedViewsManagerProps) {
  const [views, setViews] = useState<SavedView[]>(initialViews);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [editingViewId, setEditingViewId] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setViews(parsed);
      }
    } catch (error) {
      console.error('Error loading saved views:', error);
    }
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(views));
    } catch (error) {
      console.error('Error saving views:', error);
    }
  }, [views, storageKey]);

  // Create new view
  const handleCreateView = () => {
    if (!newViewName.trim()) return;

    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name: newViewName,
      columns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onViewCreate(newView);
    setViews(prev => [...prev, newView]);
    setNewViewName('');
    setShowCreateForm(false);
  };

  // Toggle favorite
  const handleToggleFavorite = (viewId: string) => {
    setViews(prev => prev.map(view => 
      view.id === viewId 
        ? { ...view, isFavorite: !view.isFavorite }
        : view
    ));
    
    const view = views.find(v => v.id === viewId);
    if (view) {
      onViewUpdate(viewId, { isFavorite: !view.isFavorite });
    }
  };

  // Delete view
  const handleDeleteView = (viewId: string) => {
    setViews(prev => prev.filter(view => view.id !== viewId));
    onViewDelete(viewId);
  };

  // Duplicate view
  const handleDuplicateView = (view: SavedView) => {
    const duplicated: SavedView = {
      ...view,
      id: `view-${Date.now()}`,
      name: `${view.name} (copia)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onViewCreate(duplicated);
    setViews(prev => [...prev, duplicated]);
  };

  // Sort views: favorites first, then by name
  const sortedViews = useMemo(() => {
    return [...views].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [views]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Vistas Guardadas</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Vista
        </Button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-hidden"
          >
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Nombre de la vista..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateView();
                  if (e.key === 'Escape') setShowCreateForm(false);
                }}
                className="flex-1"
                autoFocus
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateView}
                disabled={!newViewName.trim()}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewViewName('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Views List */}
      <div className="space-y-1">
        {sortedViews.map(view => (
          <motion.div
            key={view.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              currentViewId === view.id
                ? 'bg-blue-50 text-blue-900'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {/* Favorite star */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite(view.id);
              }}
              className="flex-shrink-0"
            >
              <Star
                className={`w-4 h-4 ${
                  view.isFavorite
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-400 hover:text-yellow-400'
                }`}
              />
            </button>

            {/* Name */}
            <button
              onClick={() => onViewSelect(view)}
              className="flex-1 text-left text-sm font-medium truncate"
            >
              {view.name}
            </button>

            {/* Badges */}
            {view.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Default
              </Badge>
            )}

            {/* Actions menu */}
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingViewId(editingViewId === view.id ? null : view.id);
                  }}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>

                {/* Dropdown menu */}
                {editingViewId === view.id && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => {
                        handleDuplicateView(view);
                        setEditingViewId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicar
                    </button>
                    {!view.isDefault && (
                      <button
                        onClick={() => {
                          handleDeleteView(view.id);
                          setEditingViewId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {sortedViews.length === 0 && (
        <div className="text-center py-6 text-sm text-gray-500">
          No hay vistas guardadas
        </div>
      )}
    </div>
  );
}

// Hook para usar saved views
export function useSavedViews(storageKey: string = 'datatable-views') {
  const [views, setViews] = useState<SavedView[]>([]);
  const [currentView, setCurrentView] = useState<SavedView | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setViews(parsed);
        
        // Set default view
        const defaultView = parsed.find((v: SavedView) => v.isDefault);
        if (defaultView) {
          setCurrentView(defaultView);
        }
      }
    } catch (error) {
      console.error('Error loading saved views:', error);
    }
  }, [storageKey]);

  const saveView = (view: SavedView) => {
    const updated = [...views, view];
    setViews(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const updateView = (viewId: string, updates: Partial<SavedView>) => {
    const updated = views.map(v =>
      v.id === viewId ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
    );
    setViews(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    
    if (currentView?.id === viewId) {
      setCurrentView({ ...currentView, ...updates });
    }
  };

  const deleteView = (viewId: string) => {
    const updated = views.filter(v => v.id !== viewId);
    setViews(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    
    if (currentView?.id === viewId) {
      setCurrentView(null);
    }
  };

  return {
    views,
    currentView,
    setCurrentView,
    saveView,
    updateView,
    deleteView,
  };
}

// Import useMemo
import { useMemo } from 'react';
