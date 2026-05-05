/**
 * CardSIGL - Componente de tarjeta estándar para SIGL v5.0
 */

import React from 'react';
import { SIGL_COLORS, SIGL_BORDERS, SIGL_SHADOWS, SIGL_SPACING } from './tokens';

interface CardSIGLProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  style?: React.CSSProperties;
}

export function CardSIGL({
  children,
  className = '',
  onClick,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  style = {},
}: CardSIGLProps) {
  const baseStyles: React.CSSProperties = {
    borderRadius: SIGL_BORDERS.radiusCard,
    transition: 'all 250ms ease-in-out',
    ...style,
  };

  // Variantes de estilo
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: SIGL_COLORS.bgPrimary,
      border: `1px solid ${SIGL_COLORS.border}`,
      boxShadow: SIGL_SHADOWS.sm,
    },
    elevated: {
      backgroundColor: SIGL_COLORS.bgPrimary,
      border: 'none',
      boxShadow: SIGL_SHADOWS.md,
    },
    outlined: {
      backgroundColor: SIGL_COLORS.bgPrimary,
      border: `2px solid ${SIGL_COLORS.border}`,
      boxShadow: 'none',
    },
    flat: {
      backgroundColor: SIGL_COLORS.bgSecondary,
      border: 'none',
      boxShadow: 'none',
    },
  };

  // Padding variants
  const paddingMap = {
    none: 0,
    sm: SIGL_SPACING.sm,
    md: SIGL_SPACING.md,
    lg: SIGL_SPACING.lg,
  };

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    padding: paddingMap[padding],
  };

  const hoverClass = hoverable || onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${hoverClass} ${clickableClass} ${className}`}
      style={combinedStyles}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * CardHeaderSIGL - Header de tarjeta con título y acciones
 */
interface CardHeaderSIGLProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  color?: string;
}

export function CardHeaderSIGL({ title, subtitle, actions, badge, color }: CardHeaderSIGLProps) {
  return (
    <div
      className="flex items-start justify-between pb-3 mb-3"
      style={{ borderBottom: `1px solid ${SIGL_COLORS.border}` }}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3
            className="font-semibold"
            style={{
              fontSize: 18,
              color: color || SIGL_COLORS.textPrimary,
            }}
          >
            {title}
          </h3>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p
            className="mt-1"
            style={{
              fontSize: 12,
              color: SIGL_COLORS.textSecondary,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
    </div>
  );
}

/**
 * CardFooterSIGL - Footer de tarjeta con acciones
 */
interface CardFooterSIGLProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooterSIGL({ children, className = '' }: CardFooterSIGLProps) {
  return (
    <div
      className={`flex items-center gap-2 pt-3 mt-3 ${className}`}
      style={{ borderTop: `1px solid ${SIGL_COLORS.border}` }}
    >
      {children}
    </div>
  );
}
