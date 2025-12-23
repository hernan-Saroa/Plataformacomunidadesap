/**
 * InputSIGL - Componente de input estándar para SIGL v5.0
 */

import React from 'react';
import { SIGL_COLORS, SIGL_BORDERS, SIGL_SPACING, SIGL_HEIGHTS } from './tokens';

interface InputSIGLProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'number' | 'tel' | 'url' | 'password' | 'date' | 'datetime-local';
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export function InputSIGL({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  required = false,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  size = 'md',
  fullWidth = true,
  className = '',
}: InputSIGLProps) {
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

  const inputStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    height: sizes.height,
    fontSize: sizes.fontSize,
    padding: sizes.padding,
    borderRadius: SIGL_BORDERS.radiusInput,
    border: `1px solid ${error ? SIGL_COLORS.danger : SIGL_COLORS.border}`,
    backgroundColor: disabled ? SIGL_COLORS.gris100 : SIGL_COLORS.bgPrimary,
    color: disabled ? SIGL_COLORS.textMuted : SIGL_COLORS.textPrimary,
    outline: 'none',
    transition: 'all 150ms ease-in-out',
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
        {icon && iconPosition === 'left' && (
          <div
            style={{
              position: 'absolute',
              left: SIGL_SPACING.sm,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: SIGL_COLORS.textSecondary,
            }}
          >
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{
            ...inputStyles,
            paddingLeft: icon && iconPosition === 'left' ? SIGL_SPACING.xl : sizes.padding.split(' ')[1],
            paddingRight: icon && iconPosition === 'right' ? SIGL_SPACING.xl : sizes.padding.split(' ')[1],
          }}
          className="focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20"
        />

        {icon && iconPosition === 'right' && (
          <div
            style={{
              position: 'absolute',
              right: SIGL_SPACING.sm,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: SIGL_COLORS.textSecondary,
            }}
          >
            {icon}
          </div>
        )}
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

/**
 * TextareaSIGL - Área de texto
 */
interface TextareaSIGLProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  rows?: number;
  fullWidth?: boolean;
  className?: string;
}

export function TextareaSIGL({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  error,
  helperText,
  rows = 4,
  fullWidth = true,
  className = '',
}: TextareaSIGLProps) {
  const textareaStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    fontSize: 14,
    padding: SIGL_SPACING.sm,
    borderRadius: SIGL_BORDERS.radiusInput,
    border: `1px solid ${error ? SIGL_COLORS.danger : SIGL_COLORS.border}`,
    backgroundColor: disabled ? SIGL_COLORS.gris100 : SIGL_COLORS.bgPrimary,
    color: disabled ? SIGL_COLORS.textMuted : SIGL_COLORS.textPrimary,
    outline: 'none',
    transition: 'all 150ms ease-in-out',
    resize: 'vertical',
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

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        style={textareaStyles}
        className="focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20"
      />

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
