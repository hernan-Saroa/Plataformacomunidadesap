/**
 * COMPONENTE: TABLE CHECKBOX
 * 
 * Checkbox accesible para selección en tablas
 * - WCAG 2.1 AA compliant
 * - Touch-friendly (44px mínimo)
 * - Animaciones suaves
 * - Estado indeterminado (para "Seleccionar todos")
 * - Keyboard navigation
 * - Screen reader support
 */

import React from 'react';
import { motion } from 'motion/react';
import { Check, Minus } from 'lucide-react';

interface TableCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
  id?: string;
}

export function TableCheckbox({
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  ariaLabel,
  id,
}: TableCheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="relative inline-flex items-center">
        {/* Input nativo (hidden pero funcional para accesibilidad) */}
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          aria-label={ariaLabel}
          className="sr-only peer"
          onKeyDown={handleKeyDown}
        />

        {/* Checkbox visual personalizado */}
        <label
          htmlFor={id}
          className={`
            relative flex items-center justify-center
            w-5 h-5 rounded-md border-2 cursor-pointer
            transition-all duration-200
            ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300'
                : checked || indeterminate
                ? 'bg-blue-600 border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                : 'bg-white border-gray-400 hover:border-blue-500 hover:bg-blue-50'
            }
            focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
            active:scale-95
          `}
        >
          {/* Checkmark animado */}
          <AnimatePresence mode="wait">
            {(checked || indeterminate) && (
              <motion.div
                key={indeterminate ? 'indeterminate' : 'checked'}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                }}
              >
                {indeterminate ? (
                  <Minus className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} aria-hidden="true" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </label>

        {/* Estado para screen readers */}
        <span className="sr-only">
          {indeterminate
            ? 'Algunos elementos seleccionados'
            : checked
            ? 'Seleccionado'
            : 'No seleccionado'}
        </span>
      </div>
    </div>
  );
}

// Animaciones

import { AnimatePresence } from 'motion/react';

// Hook personalizado para gestionar selección múltiple
export function useTableSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const isSelected = (id: string) => selectedIds.has(id);
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const getSelectedItems = () => {
    return items.filter((item) => selectedIds.has(item.id));
  };

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    toggleAllSelection,
    clearSelection,
    getSelectedItems,
  };
}
