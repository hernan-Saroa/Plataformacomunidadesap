/**
 * CARD MEJORADO CON ESTILOS ESAP
 * Versión optimizada del Card con mejor UX, animaciones y variantes
 */

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export interface CardEnhancedProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  clickable?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}

export const CardEnhanced = forwardRef<HTMLDivElement, CardEnhancedProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      hover = false,
      clickable = false,
      header,
      footer,
      className = '',
      ...props
    },
    ref
  ) => {
    // Clases base
    const baseClasses = `
      rounded-xl transition-all duration-300 ease-in-out
      ${clickable ? 'cursor-pointer' : ''}
      ${className}
    `;

    // Variantes
    const variantClasses = {
      default: `
        bg-white border border-gray-200 shadow-md
        ${hover ? 'hover:shadow-lg hover:-translate-y-1' : ''}
      `,
      elevated: `
        bg-white shadow-esap-lg
        ${hover ? 'hover:shadow-esap-xl hover:-translate-y-1' : ''}
      `,
      outlined: `
        bg-white border-2 border-[#003DA5]
        ${hover ? 'hover:shadow-md hover:border-[#0052D9]' : ''}
      `,
      glass: `
        bg-white/90 backdrop-blur-md border border-white/20
        ${hover ? 'hover:bg-white/95 hover:shadow-lg' : ''}
      `,
      gradient: `
        bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200
        ${hover ? 'hover:shadow-md hover:from-blue-100 hover:to-purple-100' : ''}
      `
    };

    // Padding
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-12'
    };

    return (
      <motion.div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]}`}
        initial={false}
        whileHover={clickable ? { scale: 1.02 } : undefined}
        whileTap={clickable ? { scale: 0.98 } : undefined}
        {...props}
      >
        {header && (
          <div className="border-b border-gray-200 pb-4 mb-4">
            {header}
          </div>
        )}
        
        <div className={paddingClasses[padding]}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            {footer}
          </div>
        )}
      </motion.div>
    );
  }
);

CardEnhanced.displayName = 'CardEnhanced';

export default CardEnhanced;
