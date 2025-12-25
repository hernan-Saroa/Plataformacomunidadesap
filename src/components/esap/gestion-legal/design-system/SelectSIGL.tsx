/**
 * SelectSIGL - Componente de select/dropdown para SIGL v5.0
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SIGL_COLORS, SIGL_BORDERS, SIGL_SPACING, SIGL_HEIGHTS } from './tokens';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectSIGLProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export function SelectSIGL({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  disabled = false,
  required = false,
  error,
  helperText,
  size = 'md',
  fullWidth = true,
  className = '',
}: SelectSIGLProps) {
  const sizeStyles: Record<string, { height: number; fontSize: number; padding: string }> = {
    sm: {
      height: SIGL_HEIGHTS.inputSm,
      fontSize: 12,
      padding: `0 ${SIGL_SPACING.sm}px`,
    },
    md: {
      height: SIGL_HEIGHTS.inputMd,
      fontSize: 14,
      padding: `0 ${SIGL_SPACING.md}px`,
    },
    lg: {
      height: SIGL_HEIGHTS.inputLg,
      fontSize: 16,
      padding: `0 ${SIGL_SPACING.md}px`,
    },
  };

  const sizes = sizeStyles[size];

  const selectStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    height: sizes.height,
    fontSize: sizes.fontSize,
    padding: sizes.padding,
    paddingRight: SIGL_SPACING.xl,
    borderRadius: SIGL_BORDERS.radiusInput,
    border: `1px solid ${error ? SIGL_COLORS.danger : SIGL_COLORS.border}`,
    backgroundColor: disabled ? SIGL_COLORS.gris100 : SIGL_COLORS.bgPrimary,
    color: disabled ? SIGL_COLORS.textMuted : SIGL_COLORS.textPrimary,
    outline: 'none',
    transition: 'all 150ms ease-in-out',
    appearance: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 500,
            color: SIGL_COLORS.textPrimary,
            marginBottom: SIGL_SPACING.xs,
          }}
        >
          {label}
          {required && <span style={{ color: SIGL_COLORS.danger }}> *</span>}
        </label>
      )}

      <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          style={selectStyles}
          className="focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20"
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        <div
          style={{
            position: 'absolute',
            right: SIGL_SPACING.sm,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            color: SIGL_COLORS.textSecondary,
          }}
        >
          <ChevronDown size={16} />
        </div>
      </div>

      {(error || helperText) && (
        <p
          style={{
            fontSize: 12,
            color: error ? SIGL_COLORS.danger : SIGL_COLORS.textSecondary,
            marginTop: SIGL_SPACING.xs,
          }}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}
