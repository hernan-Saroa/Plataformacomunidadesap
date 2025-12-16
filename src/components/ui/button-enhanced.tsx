/**
 * BOTÓN MEJORADO CON ESTILOS ESAP
 * Versión optimizada del Button con mejor UX y accesibilidad
 */

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export interface ButtonEnhancedProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  elevated?: boolean;
}

export const ButtonEnhanced = forwardRef<HTMLButtonElement, ButtonEnhancedProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      elevated = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    // Clases base
    const baseClasses = `
      inline-flex items-center justify-center gap-2
      font-bold transition-all duration-200 ease-in-out
      focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/50
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `;

    // Variantes de estilo
    const variantClasses = {
      primary: `
        bg-gradient-to-r from-[#003DA5] to-[#0052D9]
        text-white shadow-esap-md hover:shadow-esap-lg
        hover:-translate-y-0.5 active:translate-y-0 active:scale-98
      `,
      secondary: `
        bg-white text-gray-700 border-2 border-gray-300
        shadow-sm hover:shadow-md hover:border-gray-400
        hover:-translate-y-0.5 active:translate-y-0 active:scale-98
      `,
      ghost: `
        bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900
        active:scale-98
      `,
      danger: `
        bg-gradient-to-r from-red-500 to-red-600
        text-white shadow-md hover:shadow-lg
        hover:-translate-y-0.5 active:translate-y-0 active:scale-98
      `,
      success: `
        bg-gradient-to-r from-green-500 to-green-600
        text-white shadow-md hover:shadow-lg
        hover:-translate-y-0.5 active:translate-y-0 active:scale-98
      `,
      outline: `
        bg-transparent text-[#003DA5] border-2 border-[#003DA5]
        hover:bg-[#003DA5] hover:text-white
        active:scale-98
      `
    };

    // Tamaños
    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5 rounded-lg',
      md: 'text-base px-4 py-2 rounded-lg',
      lg: 'text-lg px-6 py-3 rounded-xl',
      xl: 'text-xl px-8 py-4 rounded-xl'
    };

    // Elevación adicional
    const elevatedClass = elevated ? 'shadow-esap-xl hover:shadow-esap-2xl' : '';

    return (
      <motion.button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${elevatedClass}`}
        disabled={disabled || isLoading}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!isLoading && leftIcon && <span>{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span>{rightIcon}</span>}
      </motion.button>
    );
  }
);

ButtonEnhanced.displayName = 'ButtonEnhanced';

export default ButtonEnhanced;
