/**
 * INPUT SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 */

import { forwardRef, InputHTMLAttributes, useState, TextareaHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import DESIGN_TOKENS from './tokens';

export interface InputSIGLProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  showSuccess?: boolean;
  fullWidth?: boolean;
}

export const InputSIGL = forwardRef<HTMLInputElement, InputSIGLProps>(
  (
    {
      label,
      helperText,
      error,
      showSuccess = false,
      fullWidth = true,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = Boolean(error);
    const showValidIcon = !hasError && showSuccess && props.value;

    // Estados de color
    const getBorderColor = () => {
      if (hasError) return DESIGN_TOKENS.colors.status.red;
      if (isFocused) return DESIGN_TOKENS.colors.primary.blue;
      if (props.value) return DESIGN_TOKENS.colors.primary.blue;
      return DESIGN_TOKENS.colors.neutral.lightGray;
    };

    const getBackgroundColor = () => {
      if (hasError) return '#FFF5F5';
      if (disabled) return DESIGN_TOKENS.colors.neutral.veryLightGray;
      return DESIGN_TOKENS.colors.primary.white;
    };

    const getBorderWidth = () => {
      if (hasError || isFocused) return '2px';
      return '1px';
    };

    const getBoxShadow = () => {
      if (isFocused && !hasError) {
        return '0 0 0 3px rgba(31,71,136,0.1)';
      }
      return 'none';
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
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
            {props.required && <span style={{ color: DESIGN_TOKENS.colors.status.red }}>*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          <input
            ref={ref}
            disabled={disabled}
            className="transition-all duration-200 w-full outline-none"
            style={{
              height: DESIGN_TOKENS.componentSizes.input.height,
              padding: `${DESIGN_TOKENS.padding.input.vertical} ${DESIGN_TOKENS.padding.input.horizontal}`,
              paddingRight: showValidIcon || hasError ? '40px' : DESIGN_TOKENS.padding.input.horizontal,
              fontSize: DESIGN_TOKENS.typography.fontSize.body,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
              color: disabled ? DESIGN_TOKENS.colors.neutral.mediumGray : DESIGN_TOKENS.colors.neutral.darkGray,
              background: getBackgroundColor(),
              border: `${getBorderWidth()} solid ${getBorderColor()}`,
              borderRadius: DESIGN_TOKENS.borderRadius.small,
              boxShadow: getBoxShadow(),
              cursor: disabled ? 'not-allowed' : 'text',
              opacity: disabled ? DESIGN_TOKENS.opacity.disabled : 1,
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {/* Success Icon */}
          {showValidIcon && !hasError && (
            <CheckCircle2
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              size={18}
              style={{ color: DESIGN_TOKENS.colors.status.green }}
            />
          )}

          {/* Error Icon */}
          {hasError && (
            <AlertCircle
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              size={18}
              style={{ color: DESIGN_TOKENS.colors.status.red }}
            />
          )}
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
            className="mt-1 flex items-center gap-1"
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

InputSIGL.displayName = 'InputSIGL';

// Textarea SIGL
export interface TextareaSIGLProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  showCharCount?: boolean;
  fullWidth?: boolean;
}

export const TextareaSIGL = forwardRef<HTMLTextAreaElement, TextareaSIGLProps>(
  (
    {
      label,
      helperText,
      error,
      showCharCount = false,
      fullWidth = true,
      disabled,
      maxLength,
      className = '',
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [charCount, setCharCount] = useState(
      typeof props.value === 'string' ? props.value.length : 0
    );
    const hasError = Boolean(error);

    const getBorderColor = () => {
      if (hasError) return DESIGN_TOKENS.colors.status.red;
      if (isFocused) return DESIGN_TOKENS.colors.primary.blue;
      if (props.value) return DESIGN_TOKENS.colors.primary.blue;
      return DESIGN_TOKENS.colors.neutral.lightGray;
    };

    const getBackgroundColor = () => {
      if (hasError) return '#FFF5F5';
      if (disabled) return DESIGN_TOKENS.colors.neutral.veryLightGray;
      return DESIGN_TOKENS.colors.primary.white;
    };

    const getBorderWidth = () => {
      if (hasError || isFocused) return '2px';
      return '1px';
    };

    const getBoxShadow = () => {
      if (isFocused && !hasError) {
        return '0 0 0 3px rgba(31,71,136,0.1)';
      }
      return 'none';
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
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
            {props.required && <span style={{ color: DESIGN_TOKENS.colors.status.red }}>*</span>}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          disabled={disabled}
          maxLength={maxLength}
          className="transition-all duration-200 w-full outline-none resize-vertical"
          style={{
            minHeight: DESIGN_TOKENS.componentSizes.textarea.minHeight,
            maxHeight: DESIGN_TOKENS.componentSizes.textarea.maxHeight,
            padding: `${DESIGN_TOKENS.padding.input.vertical} ${DESIGN_TOKENS.padding.input.horizontal}`,
            fontSize: DESIGN_TOKENS.typography.fontSize.body,
            lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
            color: disabled ? DESIGN_TOKENS.colors.neutral.mediumGray : DESIGN_TOKENS.colors.neutral.darkGray,
            background: getBackgroundColor(),
            border: `${getBorderWidth()} solid ${getBorderColor()}`,
            borderRadius: DESIGN_TOKENS.borderRadius.small,
            boxShadow: getBoxShadow(),
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? DESIGN_TOKENS.opacity.disabled : 1,
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          {...props}
        />

        {/* Footer (Helper text, Error, Char count) */}
        <div className="mt-1 flex items-center justify-between">
          <div className="flex-1">
            {/* Helper Text */}
            {helperText && !error && (
              <p
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
                className="flex items-center gap-1"
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.small,
                  lineHeight: DESIGN_TOKENS.typography.lineHeight.small,
                  color: DESIGN_TOKENS.colors.status.red,
                }}
              >
                <AlertCircle size={14} />
                {error}
              </p>
            )}
          </div>

          {/* Character Count */}
          {showCharCount && maxLength && (
            <p
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.small,
                lineHeight: DESIGN_TOKENS.typography.lineHeight.small,
                color: charCount >= maxLength 
                  ? DESIGN_TOKENS.colors.status.red 
                  : DESIGN_TOKENS.colors.neutral.mediumGray,
                fontWeight: charCount >= maxLength 
                  ? DESIGN_TOKENS.typography.fontWeight.semibold 
                  : DESIGN_TOKENS.typography.fontWeight.regular,
              }}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

TextareaSIGL.displayName = 'TextareaSIGL';
