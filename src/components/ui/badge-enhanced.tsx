/**
 * BADGE MEJORADO CON ESTILOS ESAP
 * Versión optimizada del Badge con mejor contraste WCAG AAA y variantes
 */

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';

export interface BadgeEnhancedProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  dot?: boolean;
  outlined?: boolean;
  pulse?: boolean;
}

export const BadgeEnhanced = forwardRef<HTMLSpanElement, BadgeEnhancedProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      dot = false,
      outlined = false,
      pulse = false,
      className = '',
      ...props
    },
    ref
  ) => {
    // Clases base
    const baseClasses = `
      inline-flex items-center gap-1.5 font-bold uppercase tracking-wide
      transition-all duration-200 ease-in-out
      ${pulse ? 'animate-pulse-soft' : ''}
      ${className}
    `;

    // Variantes con contraste WCAG AAA
    const variantClasses = {
      primary: outlined
        ? 'bg-white text-blue-800 border-2 border-blue-300'
        : 'bg-blue-100 text-blue-800 border border-blue-300',
      success: outlined
        ? 'bg-white text-green-800 border-2 border-green-300'
        : 'bg-green-100 text-green-800 border border-green-300',
      warning: outlined
        ? 'bg-white text-yellow-900 border-2 border-yellow-300'
        : 'bg-yellow-100 text-yellow-900 border border-yellow-300',
      danger: outlined
        ? 'bg-white text-red-800 border-2 border-red-300'
        : 'bg-red-100 text-red-800 border border-red-300',
      info: outlined
        ? 'bg-white text-blue-700 border-2 border-blue-200'
        : 'bg-blue-50 text-blue-700 border border-blue-200',
      purple: outlined
        ? 'bg-white text-purple-800 border-2 border-purple-300'
        : 'bg-purple-100 text-purple-800 border border-purple-300',
      gray: outlined
        ? 'bg-white text-gray-800 border-2 border-gray-300'
        : 'bg-gray-100 text-gray-800 border border-gray-300'
    };

    // Tamaños
    const sizeClasses = {
      sm: 'text-xs px-2 py-0.5 rounded-md',
      md: 'text-xs px-3 py-1 rounded-lg',
      lg: 'text-sm px-4 py-1.5 rounded-lg'
    };

    // Color del dot según variante
    const dotColors = {
      primary: 'bg-blue-600',
      success: 'bg-green-600',
      warning: 'bg-yellow-600',
      danger: 'bg-red-600',
      info: 'bg-blue-500',
      purple: 'bg-purple-600',
      gray: 'bg-gray-600'
    };

    return (
      <motion.span
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${pulse ? 'animate-pulse' : ''}`}
          />
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </motion.span>
    );
  }
);

BadgeEnhanced.displayName = 'BadgeEnhanced';

export default BadgeEnhanced;
