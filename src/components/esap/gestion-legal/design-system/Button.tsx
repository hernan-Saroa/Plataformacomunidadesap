/**
 * BOTÓN SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 */

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import DESIGN_TOKENS from './tokens';

export interface ButtonSIGLProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const ButtonSIGL = forwardRef<HTMLButtonElement, ButtonSIGLProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      isLoading = false,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    // Estilos según variante
    const variantStyles = {
      primary: {
        normal: {
          background: DESIGN_TOKENS.colors.primary.blue,
          color: DESIGN_TOKENS.colors.primary.white,
          border: 'none',
        },
        hover: {
          background: DESIGN_TOKENS.colors.primary.blueHover,
        },
        active: {
          background: DESIGN_TOKENS.colors.primary.blueActive,
        },
      },
      secondary: {
        normal: {
          background: DESIGN_TOKENS.colors.primary.white,
          color: DESIGN_TOKENS.colors.primary.blue,
          border: `2px solid ${DESIGN_TOKENS.colors.primary.blue}`,
        },
        hover: {
          background: DESIGN_TOKENS.colors.primary.light,
        },
        active: {
          background: '#D0E2F5',
        },
      },
      danger: {
        normal: {
          background: DESIGN_TOKENS.colors.status.red,
          color: DESIGN_TOKENS.colors.primary.white,
          border: 'none',
        },
        hover: {
          background: '#c82333',
        },
        active: {
          background: '#a01828',
        },
      },
      success: {
        normal: {
          background: DESIGN_TOKENS.colors.status.green,
          color: DESIGN_TOKENS.colors.primary.white,
          border: 'none',
        },
        hover: {
          background: '#218838',
        },
        active: {
          background: '#1a6628',
        },
      },
      outline: {
        normal: {
          background: DESIGN_TOKENS.colors.primary.white,
          color: DESIGN_TOKENS.colors.primary.blue,
          border: `2px solid ${DESIGN_TOKENS.colors.primary.blue}`,
        },
        hover: {
          background: DESIGN_TOKENS.colors.primary.light,
        },
        active: {
          background: '#D0E2F5',
        },
      },
      ghost: {
        normal: {
          background: 'transparent',
          color: DESIGN_TOKENS.colors.primary.blue,
          border: 'none',
        },
        hover: {
          background: DESIGN_TOKENS.colors.primary.light,
        },
        active: {
          background: '#D0E2F5',
        },
      },
    };

    // Estilos según tamaño
    const sizeStyles = {
      small: {
        height: '32px',
        padding: '8px 12px',
        fontSize: '12px',
        minWidth: '80px',
      },
      medium: {
        height: DESIGN_TOKENS.componentSizes.button.height,
        padding: `${DESIGN_TOKENS.padding.button.vertical} ${DESIGN_TOKENS.padding.button.horizontal}`,
        fontSize: DESIGN_TOKENS.typography.fontSize.button,
        minWidth: DESIGN_TOKENS.componentSizes.button.minWidth,
      },
      large: {
        height: '48px',
        padding: '14px 20px',
        fontSize: '16px',
        minWidth: '120px',
      },
    };

    // Validación y fallback de variante
    const validVariant = variant && variantStyles[variant] ? variant : 'primary';
    const validSize = size && sizeStyles[size] ? size : 'medium';
    
    const styles = variantStyles[validVariant];
    const sizing = sizeStyles[validSize];

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`
          inline-flex items-center justify-center gap-2
          font-semibold rounded
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-60 disabled:cursor-not-allowed
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        style={{
          ...styles.normal,
          ...sizing,
          borderRadius: DESIGN_TOKENS.borderRadius.small,
          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
          lineHeight: DESIGN_TOKENS.typography.lineHeight.button,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isLoading) {
            Object.assign(e.currentTarget.style, styles.hover);
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isLoading) {
            Object.assign(e.currentTarget.style, styles.normal);
          }
        }}
        onMouseDown={(e) => {
          if (!disabled && !isLoading) {
            Object.assign(e.currentTarget.style, styles.active);
          }
        }}
        onMouseUp={(e) => {
          if (!disabled && !isLoading) {
            Object.assign(e.currentTarget.style, styles.hover);
          }
        }}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && (
          <Loader2 
            className="animate-spin" 
            size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
          />
        )}

        {/* Icon left */}
        {!isLoading && icon && iconPosition === 'left' && (
          <span className="flex items-center">{icon}</span>
        )}

        {/* Text */}
        <span style={{ opacity: isLoading ? 0.7 : 1 }}>
          {children}
        </span>

        {/* Icon right */}
        {!isLoading && icon && iconPosition === 'right' && (
          <span className="flex items-center">{icon}</span>
        )}
      </motion.button>
    );
  }
);

ButtonSIGL.displayName = 'ButtonSIGL';

// Botón de icono (square)
export interface IconButtonSIGLProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  tooltip?: string;
}

export const IconButtonSIGL = forwardRef<HTMLButtonElement, IconButtonSIGLProps>(
  (
    {
      icon,
      variant = 'default',
      size = 'medium',
      tooltip,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeMap = {
      small: 28,
      medium: 36,
      large: 44,
    };

    const iconSizeMap = {
      small: 14,
      medium: 18,
      large: 22,
    };

    const variantColors = {
      default: {
        icon: DESIGN_TOKENS.colors.neutral.mediumGray,
        hoverBg: DESIGN_TOKENS.colors.primary.light,
        activeBg: '#D0E2F5',
      },
      primary: {
        icon: DESIGN_TOKENS.colors.primary.blue,
        hoverBg: DESIGN_TOKENS.colors.primary.light,
        activeBg: '#D0E2F5',
      },
      danger: {
        icon: DESIGN_TOKENS.colors.status.red,
        hoverBg: '#FFF5F5',
        activeBg: '#FFE5E5',
      },
    };

    const colors = variantColors[variant];
    const buttonSize = sizeMap[size];
    const iconSize = iconSizeMap[size];

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        title={tooltip}
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`
          inline-flex items-center justify-center
          rounded transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          color: colors.icon,
          background: 'transparent',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: DESIGN_TOKENS.borderRadius.small,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = colors.hoverBg;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
        onMouseDown={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = colors.activeBg;
          }
        }}
        onMouseUp={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = colors.hoverBg;
          }
        }}
        {...props}
      >
        <span 
          style={{ 
            width: `${iconSize}px`, 
            height: `${iconSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
      </motion.button>
    );
  }
);

IconButtonSIGL.displayName = 'IconButtonSIGL';