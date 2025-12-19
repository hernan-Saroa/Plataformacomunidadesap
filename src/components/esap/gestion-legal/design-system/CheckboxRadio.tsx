/**
 * CHECKBOX & RADIO SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 * Sección 2.2.4 (Checkbox) y 2.2.5 (Radio Button)
 */

import { forwardRef, InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import DESIGN_TOKENS from './tokens';

// ========================================
// CHECKBOX SIGL
// ========================================

export interface CheckboxSIGLProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  size?: 'small' | 'medium' | 'large';
}

export const CheckboxSIGL = forwardRef<HTMLInputElement, CheckboxSIGLProps>(
  (
    {
      label,
      error,
      size = 'medium',
      disabled,
      checked,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeMap = {
      small: 14,
      medium: 18,
      large: 22,
    };

    const checkboxSize = sizeMap[size];
    const checkmarkSize = size === 'small' ? 10 : size === 'large' ? 16 : 12;

    // Estilos según estado
    const getCheckboxStyles = (isChecked: boolean, isHovered: boolean) => {
      if (disabled) {
        return {
          background: DESIGN_TOKENS.colors.neutral.veryLightGray,
          border: `2px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
          opacity: DESIGN_TOKENS.opacity.disabled,
        };
      }

      if (isChecked) {
        if (isHovered) {
          return {
            background: DESIGN_TOKENS.colors.primary.blueHover,
            border: `2px solid ${DESIGN_TOKENS.colors.primary.blueHover}`,
          };
        }
        return {
          background: DESIGN_TOKENS.colors.primary.blue,
          border: `2px solid ${DESIGN_TOKENS.colors.primary.blue}`,
        };
      }

      if (isHovered) {
        return {
          background: DESIGN_TOKENS.colors.primary.light,
          border: `2px solid ${DESIGN_TOKENS.colors.primary.blue}`,
        };
      }

      return {
        background: DESIGN_TOKENS.colors.primary.white,
        border: `2px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
      };
    };

    return (
      <label
        className={`inline-flex items-center gap-2 cursor-pointer ${
          disabled ? 'cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative inline-block">
          {/* Hidden native checkbox */}
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="sr-only"
            {...props}
          />

          {/* Custom checkbox visual */}
          <motion.div
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: `${checkboxSize}px`,
              height: `${checkboxSize}px`,
              borderRadius: DESIGN_TOKENS.borderRadius.small,
              cursor: disabled ? 'not-allowed' : 'pointer',
              ...getCheckboxStyles(!!checked, false),
            }}
          >
            {/* Checkmark */}
            {checked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <Check
                  size={checkmarkSize}
                  style={{
                    color: DESIGN_TOKENS.colors.primary.white,
                    strokeWidth: 3,
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Label */}
        {label && (
          <span
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.body,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
              color: disabled
                ? DESIGN_TOKENS.colors.neutral.mediumGray
                : DESIGN_TOKENS.colors.neutral.darkGray,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.regular,
              userSelect: 'none',
            }}
          >
            {label}
          </span>
        )}

        {/* Error message */}
        {error && (
          <span
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              color: DESIGN_TOKENS.colors.status.red,
              marginLeft: DESIGN_TOKENS.spacing.s,
            }}
          >
            {error}
          </span>
        )}
      </label>
    );
  }
);

CheckboxSIGL.displayName = 'CheckboxSIGL';

// ========================================
// RADIO BUTTON SIGL
// ========================================

export interface RadioButtonSIGLProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  size?: 'small' | 'medium' | 'large';
}

export const RadioButtonSIGL = forwardRef<HTMLInputElement, RadioButtonSIGLProps>(
  (
    {
      label,
      error,
      size = 'medium',
      disabled,
      checked,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeMap = {
      small: 16,
      medium: 20,
      large: 24,
    };

    const radioSize = sizeMap[size];
    const dotSize = size === 'small' ? 8 : size === 'large' ? 12 : 10;

    // Estilos según estado
    const getRadioStyles = (isChecked: boolean, isHovered: boolean) => {
      if (disabled) {
        return {
          background: DESIGN_TOKENS.colors.neutral.veryLightGray,
          border: `2px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
          opacity: DESIGN_TOKENS.opacity.disabled,
        };
      }

      if (isHovered) {
        if (isChecked) {
          return {
            background: DESIGN_TOKENS.colors.primary.white,
            border: `2px solid ${DESIGN_TOKENS.colors.primary.blueHover}`,
          };
        }
        return {
          background: DESIGN_TOKENS.colors.primary.light,
          border: `2px solid ${DESIGN_TOKENS.colors.primary.blue}`,
        };
      }

      if (isChecked) {
        return {
          background: DESIGN_TOKENS.colors.primary.white,
          border: `2px solid ${DESIGN_TOKENS.colors.primary.blue}`,
        };
      }

      return {
        background: DESIGN_TOKENS.colors.primary.white,
        border: `2px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
      };
    };

    const getDotColor = (isHovered: boolean) => {
      if (disabled) {
        return DESIGN_TOKENS.colors.neutral.mediumGray;
      }
      if (isHovered) {
        return DESIGN_TOKENS.colors.primary.blueHover;
      }
      return DESIGN_TOKENS.colors.primary.blue;
    };

    return (
      <label
        className={`inline-flex items-center gap-2 cursor-pointer ${
          disabled ? 'cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative inline-block">
          {/* Hidden native radio */}
          <input
            ref={ref}
            type="radio"
            checked={checked}
            disabled={disabled}
            className="sr-only"
            {...props}
          />

          {/* Custom radio visual */}
          <motion.div
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: `${radioSize}px`,
              height: `${radioSize}px`,
              borderRadius: DESIGN_TOKENS.borderRadius.round,
              cursor: disabled ? 'not-allowed' : 'pointer',
              ...getRadioStyles(!!checked, false),
            }}
          >
            {/* Inner dot */}
            {checked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  width: `${dotSize}px`,
                  height: `${dotSize}px`,
                  borderRadius: DESIGN_TOKENS.borderRadius.round,
                  background: getDotColor(false),
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Label */}
        {label && (
          <span
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.body,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
              color: disabled
                ? DESIGN_TOKENS.colors.neutral.mediumGray
                : DESIGN_TOKENS.colors.neutral.darkGray,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.regular,
              userSelect: 'none',
            }}
          >
            {label}
          </span>
        )}

        {/* Error message */}
        {error && (
          <span
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              color: DESIGN_TOKENS.colors.status.red,
              marginLeft: DESIGN_TOKENS.spacing.s,
            }}
          >
            {error}
          </span>
        )}
      </label>
    );
  }
);

RadioButtonSIGL.displayName = 'RadioButtonSIGL';

// ========================================
// RADIO GROUP SIGL (Helper component)
// ========================================

export interface RadioGroupOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupSIGLProps {
  label?: string;
  options: RadioGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
  name: string;
  error?: string;
  helperText?: string;
  direction?: 'vertical' | 'horizontal';
  size?: 'small' | 'medium' | 'large';
  required?: boolean;
  className?: string;
}

export function RadioGroupSIGL({
  label,
  options,
  value,
  onChange,
  name,
  error,
  helperText,
  direction = 'vertical',
  size = 'medium',
  required = false,
  className = '',
}: RadioGroupSIGLProps) {
  return (
    <div className={className}>
      {/* Group Label */}
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

      {/* Radio Options */}
      <div
        className={`flex ${
          direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        }`}
        style={{
          gap: direction === 'vertical' 
            ? DESIGN_TOKENS.spacing.m 
            : DESIGN_TOKENS.spacing.l,
        }}
      >
        {options.map((option) => (
          <RadioButtonSIGL
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            label={option.label}
            disabled={option.disabled}
            size={size}
          />
        ))}
      </div>

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
