/**
 * SELECT SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 * Sección 2.2.3 - Select/Dropdown
 */

import { useState, useRef, useEffect, forwardRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DESIGN_TOKENS from './tokens';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectSIGLProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  searchable?: boolean;
  required?: boolean;
  className?: string;
}

export const SelectSIGL = forwardRef<HTMLDivElement, SelectSIGLProps>(
  (
    {
      label,
      placeholder = 'Seleccionar...',
      options,
      value,
      onChange,
      disabled = false,
      error,
      helperText,
      fullWidth = true,
      searchable = false,
      required = false,
      className = '',
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Encontrar opción seleccionada
    const selectedOption = options.find((opt) => opt.value === value);

    // Filtrar opciones según búsqueda
    const filteredOptions = searchable
      ? options.filter((opt) =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options;

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearchTerm('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        // Auto-focus search input si es searchable
        if (searchable && searchInputRef.current) {
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, searchable]);

    // Keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
              const option = filteredOptions[highlightedIndex];
              if (!option.disabled) {
                handleSelect(option.value);
              }
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsOpen(false);
            setSearchTerm('');
            break;
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, highlightedIndex, filteredOptions]);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(-1);
    };

    const getBorderColor = () => {
      if (error) return DESIGN_TOKENS.colors.status.red;
      if (isOpen) return DESIGN_TOKENS.colors.primary.blue;
      return DESIGN_TOKENS.colors.neutral.lightGray;
    };

    const getBorderWidth = () => {
      if (error || isOpen) return '2px';
      return '1px';
    };

    return (
      <div
        ref={containerRef}
        className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {/* Label */}
        {label && (
          <label
            className="block mb-2"
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.label,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.label,
              color: DESIGN_TOKENS.colors.neutral.darkGray,
            }}
          >
            {label}
            {required && (
              <span style={{ color: DESIGN_TOKENS.colors.status.red }}>*</span>
            )}
          </label>
        )}

        {/* Select Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className="w-full flex items-center justify-between transition-all duration-200 outline-none text-left"
          style={{
            height: DESIGN_TOKENS.componentSizes.input.height,
            padding: `${DESIGN_TOKENS.padding.input.vertical} ${DESIGN_TOKENS.padding.input.horizontal}`,
            fontSize: DESIGN_TOKENS.typography.fontSize.body,
            lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
            color: selectedOption
              ? DESIGN_TOKENS.colors.neutral.darkGray
              : DESIGN_TOKENS.colors.neutral.mediumGray,
            background: disabled
              ? DESIGN_TOKENS.colors.neutral.veryLightGray
              : DESIGN_TOKENS.colors.primary.white,
            border: `${getBorderWidth()} solid ${getBorderColor()}`,
            borderRadius: DESIGN_TOKENS.borderRadius.small,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? DESIGN_TOKENS.opacity.disabled : 1,
          }}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ChevronDown
              size={18}
              style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }}
            />
          </motion.div>
        </button>

        {/* Dropdown List */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute z-50 w-full mt-1"
              style={{
                background: DESIGN_TOKENS.colors.primary.white,
                border: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
                borderRadius: DESIGN_TOKENS.borderRadius.small,
                boxShadow: DESIGN_TOKENS.shadows.level2,
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {/* Search Input */}
              {searchable && (
                <div
                  className="sticky top-0 z-10"
                  style={{
                    padding: DESIGN_TOKENS.spacing.s,
                    background: DESIGN_TOKENS.colors.primary.white,
                    borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
                  }}
                >
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2"
                      style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }}
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-8 outline-none"
                      style={{
                        height: '32px',
                        padding: '6px 8px 6px 32px',
                        fontSize: DESIGN_TOKENS.typography.fontSize.small,
                        color: DESIGN_TOKENS.colors.neutral.darkGray,
                        background: DESIGN_TOKENS.colors.primary.light,
                        border: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
                        borderRadius: DESIGN_TOKENS.borderRadius.small,
                      }}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      >
                        <X
                          size={14}
                          style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }}
                        />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Options List */}
              {filteredOptions.length > 0 ? (
                <div>
                  {filteredOptions.map((option, index) => {
                    const isSelected = option.value === value;
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => handleSelect(option.value)}
                        className="w-full text-left transition-colors duration-150"
                        style={{
                          height: '36px',
                          padding: '10px 12px',
                          fontSize: DESIGN_TOKENS.typography.fontSize.body,
                          color: option.disabled
                            ? DESIGN_TOKENS.colors.neutral.mediumGray
                            : isSelected
                            ? DESIGN_TOKENS.colors.primary.white
                            : DESIGN_TOKENS.colors.neutral.darkGray,
                          background: option.disabled
                            ? DESIGN_TOKENS.colors.neutral.veryLightGray
                            : isSelected
                            ? DESIGN_TOKENS.colors.primary.blue
                            : isHighlighted
                            ? DESIGN_TOKENS.colors.primary.light
                            : DESIGN_TOKENS.colors.primary.white,
                          borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
                          cursor: option.disabled ? 'not-allowed' : 'pointer',
                          fontWeight: isSelected
                            ? DESIGN_TOKENS.typography.fontWeight.semibold
                            : DESIGN_TOKENS.typography.fontWeight.regular,
                        }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  className="text-center"
                  style={{
                    padding: DESIGN_TOKENS.spacing.l,
                    fontSize: DESIGN_TOKENS.typography.fontSize.small,
                    color: DESIGN_TOKENS.colors.neutral.mediumGray,
                  }}
                >
                  No se encontraron resultados
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Helper Text */}
        {helperText && !error && (
          <p
            className="mt-1"
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.small,
              color: DESIGN_TOKENS.colors.neutral.mediumGray,
            }}
          >
            {helperText}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p
            className="mt-1"
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.small,
              color: DESIGN_TOKENS.colors.status.red,
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

SelectSIGL.displayName = 'SelectSIGL';
