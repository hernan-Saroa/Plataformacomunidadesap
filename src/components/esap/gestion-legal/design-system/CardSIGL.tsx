/**
 * CARD SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 * Sección 2.3 - Cards
 */

import { ReactNode, HTMLAttributes } from 'react';
import { motion } from 'motion/react';
import DESIGN_TOKENS from './tokens';

export interface CardSIGLProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  headerColor?: string;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  footerAlign?: 'left' | 'center' | 'right';
  children: ReactNode;
  hoverable?: boolean;
  noPadding?: boolean;
  className?: string;
}

export function CardSIGL({
  header,
  headerColor,
  headerIcon,
  footer,
  footerAlign = 'right',
  children,
  hoverable = false,
  noPadding = false,
  className = '',
  style,
  ...props
}: CardSIGLProps) {
  const defaultHeaderColor = DESIGN_TOKENS.colors.primary.blue;
  const actualHeaderColor = headerColor || defaultHeaderColor;

  return (
    <motion.div
      whileHover={hoverable ? { scale: 1.01 } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        background: DESIGN_TOKENS.colors.primary.white,
        border: `1px solid ${DESIGN_TOKENS.colors.primary.light}`,
        borderRadius: DESIGN_TOKENS.borderRadius.medium,
        boxShadow: DESIGN_TOKENS.shadows.level1,
        marginBottom: DESIGN_TOKENS.margin.betweenCards,
        ...style,
      }}
      {...props}
    >
      {/* Header (opcional) */}
      {header && (
        <div
          className="flex items-center justify-between"
          style={{
            background: actualHeaderColor,
            color: DESIGN_TOKENS.colors.primary.white,
            padding: DESIGN_TOKENS.padding.cardHeader,
            fontSize: '16px',
            fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
          }}
        >
          <div className="flex-1">{header}</div>
          {headerIcon && <div className="ml-2">{headerIcon}</div>}
        </div>
      )}

      {/* Content */}
      <div
        style={{
          padding: noPadding ? 0 : DESIGN_TOKENS.padding.card,
          fontSize: DESIGN_TOKENS.typography.fontSize.body,
          lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
          color: DESIGN_TOKENS.colors.neutral.darkGray,
        }}
      >
        {children}
      </div>

      {/* Footer (opcional) */}
      {footer && (
        <div
          className={`flex ${
            footerAlign === 'left'
              ? 'justify-start'
              : footerAlign === 'center'
              ? 'justify-center'
              : 'justify-end'
          }`}
          style={{
            padding: DESIGN_TOKENS.padding.cardFooter,
            borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
            background: DESIGN_TOKENS.colors.neutral.veryLightGray,
            gap: DESIGN_TOKENS.spacing.s,
          }}
        >
          {footer}
        </div>
      )}
    </motion.div>
  );
}

// ========================================
// CARD VARIANTES ESPECÍFICAS
// ========================================

// Card de Alerta
export interface AlertCardProps extends Omit<CardSIGLProps, 'headerColor'> {
  variant: 'success' | 'warning' | 'error' | 'info';
  icon?: ReactNode;
  title: string;
  closable?: boolean;
  onClose?: () => void;
}

export function AlertCard({
  variant,
  icon,
  title,
  closable = false,
  onClose,
  children,
  className = '',
  ...props
}: AlertCardProps) {
  const variantColors = {
    success: {
      bg: '#D1FAE5',
      border: DESIGN_TOKENS.colors.status.green,
      icon: '✓',
    },
    warning: {
      bg: '#FEF3C7',
      border: DESIGN_TOKENS.colors.status.yellow,
      icon: '⚠️',
    },
    error: {
      bg: '#FEE2E2',
      border: DESIGN_TOKENS.colors.status.red,
      icon: '❌',
    },
    info: {
      bg: '#DBEAFE',
      border: DESIGN_TOKENS.colors.primary.blue,
      icon: 'ℹ️',
    },
  };

  const colors = variantColors[variant];

  return (
    <CardSIGL
      className={className}
      style={{
        background: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        marginBottom: DESIGN_TOKENS.spacing.m,
      }}
      {...props}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-xl">{icon || colors.icon}</div>

        {/* Content */}
        <div className="flex-1">
          <h4
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.h3,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
              color: DESIGN_TOKENS.colors.neutral.darkGray,
              marginBottom: DESIGN_TOKENS.spacing.xs,
            }}
          >
            {title}
          </h4>
          <div
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.body,
              color: DESIGN_TOKENS.colors.neutral.darkGray,
            }}
          >
            {children}
          </div>
        </div>

        {/* Close Button */}
        {closable && (
          <button
            onClick={onClose}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: DESIGN_TOKENS.colors.neutral.mediumGray,
            }}
          >
            ×
          </button>
        )}
      </div>
    </CardSIGL>
  );
}

// Card de Métrica/Estadística
export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  color?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = DESIGN_TOKENS.colors.primary.blue,
  className = '',
  ...props
}: StatCardProps) {
  const trendColor =
    trend?.direction === 'up'
      ? DESIGN_TOKENS.colors.status.green
      : DESIGN_TOKENS.colors.status.red;

  return (
    <CardSIGL hoverable className={className} {...props}>
      <div className="flex items-start justify-between">
        {/* Left content */}
        <div className="flex-1">
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              color: DESIGN_TOKENS.colors.neutral.mediumGray,
              marginBottom: DESIGN_TOKENS.spacing.xs,
              textTransform: 'uppercase',
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            }}
          >
            {title}
          </p>
          <h3
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.h1,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
              color: DESIGN_TOKENS.colors.neutral.darkGray,
              lineHeight: 1.2,
              marginBottom: DESIGN_TOKENS.spacing.xs,
            }}
          >
            {value}
          </h3>
          {subtitle && (
            <p
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.small,
                color: DESIGN_TOKENS.colors.neutral.mediumGray,
              }}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className="flex items-center gap-1 mt-2"
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.small,
                color: trendColor,
                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
              }}
            >
              <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
              <span>{trend.value}%</span>
              <span
                style={{
                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.regular,
                }}
              >
                {trend.label}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: '48px',
              height: '48px',
              background: `${color}15`,
              color: color,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </CardSIGL>
  );
}

// Card Colapsable
export interface CollapsibleCardProps extends CardSIGLProps {
  title: string;
  defaultOpen?: boolean;
  icon?: ReactNode;
}

export function CollapsibleCard({
  title,
  defaultOpen = true,
  icon,
  children,
  className = '',
  ...props
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <CardSIGL className={className} noPadding {...props}>
      {/* Header clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between transition-colors hover:bg-gray-50"
        style={{
          padding: DESIGN_TOKENS.padding.cardHeader,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <h3
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.h3,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
              color: DESIGN_TOKENS.colors.neutral.darkGray,
            }}
          >
            {title}
          </h3>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            color: DESIGN_TOKENS.colors.neutral.mediumGray,
          }}
        >
          ▼
        </motion.div>
      </button>

      {/* Content collapsible */}
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: DESIGN_TOKENS.padding.card,
            borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
          }}
        >
          {children}
        </div>
      </motion.div>
    </CardSIGL>
  );
}

// Import React for CollapsibleCard
import * as React from 'react';
