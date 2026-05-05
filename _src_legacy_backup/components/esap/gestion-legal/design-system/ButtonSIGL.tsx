/**
 * ButtonSIGL - Componente de botón estándar para SIGL v5.0
 */

import React from 'react';
import { SIGL_COLORS, SIGL_BORDERS, SIGL_SPACING, SIGL_HEIGHTS } from './tokens';

interface ButtonSIGLProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ButtonSIGL({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  style = {},
}: ButtonSIGLProps) {
  // Variantes de color
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? SIGL_COLORS.gris400 : SIGL_COLORS.primary,
      color: SIGL_COLORS.textWhite,
      border: 'none',
    },
    secondary: {
      backgroundColor: disabled ? SIGL_COLORS.gris300 : SIGL_COLORS.gris200,
      color: disabled ? SIGL_COLORS.textMuted : SIGL_COLORS.textPrimary,
      border: `1px solid ${SIGL_COLORS.border}`,
    },
    danger: {
      backgroundColor: disabled ? SIGL_COLORS.gris400 : SIGL_COLORS.danger,
      color: SIGL_COLORS.textWhite,
      border: 'none',
    },
    success: {
      backgroundColor: disabled ? SIGL_COLORS.gris400 : SIGL_COLORS.success,
      color: SIGL_COLORS.textWhite,
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: disabled ? SIGL_COLORS.textMuted : SIGL_COLORS.primary,
      border: `1px solid ${disabled ? SIGL_COLORS.border : SIGL_COLORS.primary}`,
    },
    link: {
      backgroundColor: 'transparent',
      color: disabled ? SIGL_COLORS.textMuted : SIGL_COLORS.primary,
      border: 'none',
    },
  };

  // Tamaños
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      height: SIGL_HEIGHTS.buttonSm,
      padding: `0 ${SIGL_SPACING.sm}px`,
      fontSize: 12,
    },
    md: {
      height: SIGL_HEIGHTS.buttonMd,
      padding: `0 ${SIGL_SPACING.md}px`,
      fontSize: 14,
    },
    lg: {
      height: SIGL_HEIGHTS.buttonLg,
      padding: `0 ${SIGL_SPACING.lg}px`,
      fontSize: 16,
    },
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIGL_SPACING.xs,
    borderRadius: SIGL_BORDERS.radiusButton,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 150ms ease-in-out',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  const hoverClass = !disabled
    ? variant === 'link'
      ? 'hover:underline'
      : 'hover:opacity-90 hover:scale-[1.02]'
    : '';

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${hoverClass} ${className}`}
      style={baseStyles}
    >
      {icon && iconPosition === 'left' && <span>{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
}

/**
 * ButtonGroupSIGL - Grupo de botones
 */
interface ButtonGroupSIGLProps {
  children: React.ReactNode;
  className?: string;
}

export function ButtonGroupSIGL({ children, className = '' }: ButtonGroupSIGLProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {children}
    </div>
  );
}
