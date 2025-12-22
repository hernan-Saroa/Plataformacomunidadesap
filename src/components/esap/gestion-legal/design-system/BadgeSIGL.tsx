/**
 * BADGE SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 */

import { HTMLAttributes } from 'react';
import DESIGN_TOKENS, { getStatusColor } from './tokens';

export interface BadgeSIGLProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'recibida' | 'enDefensa' | 'respondida' | 'vencida' | 'sentenciada' | 'enProceso' | 'extendida' | 'custom' | 
            'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  customColor?: { bg: string; text: string };
  size?: 'small' | 'medium' | 'large' | 'sm';
  rounded?: boolean;
}

export function BadgeSIGL({
  variant = 'recibida',
  customColor,
  size = 'medium',
  rounded = false,
  children,
  className = '',
  style,
  ...props
}: BadgeSIGLProps) {
  // Normalizar tamaños
  const normalizedSize = size === 'sm' ? 'small' : size;

  // Obtener colores según variante
  const getColorsByVariant = (v: string) => {
    // Variantes estándar (genéricas)
    const standardVariants: Record<string, { bg: string; text: string }> = {
      default: { bg: '#F3F4F6', text: '#374151' },
      primary: { bg: '#003DA5', text: '#FFFFFF' },
      success: { bg: '#10B981', text: '#FFFFFF' },
      warning: { bg: '#F59E0B', text: '#FFFFFF' },
      danger: { bg: '#EF4444', text: '#FFFFFF' },
      info: { bg: '#3B82F6', text: '#FFFFFF' },
    };

    if (standardVariants[v]) {
      return standardVariants[v];
    }

    // Variantes SIGL originales
    if (v === 'custom' && customColor) {
      return customColor;
    }

    return getStatusColor(v);
  };

  const colors = getColorsByVariant(variant);

  // Tamaños
  const sizeStyles = {
    small: {
      padding: '2px 6px',
      fontSize: '10px',
      height: '18px',
    },
    medium: {
      padding: '4px 8px',
      fontSize: '11px',
      height: '22px',
    },
    large: {
      padding: '6px 12px',
      fontSize: '12px',
      height: '28px',
    },
  };

  const sizing = sizeStyles[normalizedSize];

  return (
    <span
      className={`inline-flex items-center justify-center font-bold uppercase ${className}`}
      style={{
        ...sizing,
        background: colors.bg,
        color: colors.text,
        borderRadius: rounded ? DESIGN_TOKENS.borderRadius.round : DESIGN_TOKENS.borderRadius.small,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

// Badge de plazo (con semáforo de colores)
export interface PlazoBadgeProps extends HTMLAttributes<HTMLDivElement> {
  diasRestantes: number;
  vencido?: boolean;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function PlazoBadge({
  diasRestantes,
  vencido = false,
  showIcon = true,
  size = 'medium',
  className = '',
  ...props
}: PlazoBadgeProps) {
  // Determinar color según días restantes
  const getColor = () => {
    if (vencido || diasRestantes < 0) {
      return {
        bg: DESIGN_TOKENS.colors.status.red,
        text: DESIGN_TOKENS.colors.primary.white,
        icon: '❌',
        label: 'VENCIDA',
      };
    }
    if (diasRestantes < 5) {
      return {
        bg: DESIGN_TOKENS.colors.status.orange,
        text: DESIGN_TOKENS.colors.primary.white,
        icon: '⚠️',
        label: `${diasRestantes} DÍAS`,
      };
    }
    if (diasRestantes < 15) {
      return {
        bg: DESIGN_TOKENS.colors.status.yellow,
        text: DESIGN_TOKENS.colors.neutral.darkGray,
        icon: '⚠️',
        label: `${diasRestantes} DÍAS`,
      };
    }
    return {
      bg: DESIGN_TOKENS.colors.status.green,
      text: DESIGN_TOKENS.colors.primary.white,
      icon: '✓',
      label: `${diasRestantes} DÍAS`,
    };
  };

  const colorData = getColor();

  const sizeStyles = {
    small: {
      padding: '4px 8px',
      fontSize: '10px',
      iconSize: '12px',
    },
    medium: {
      padding: '6px 10px',
      fontSize: '11px',
      iconSize: '14px',
    },
    large: {
      padding: '8px 12px',
      fontSize: '12px',
      iconSize: '16px',
    },
  };

  const sizing = sizeStyles[size];

  return (
    <div
      className={`inline-flex items-center gap-1 font-bold rounded ${className}`}
      style={{
        ...sizing,
        background: colorData.bg,
        color: colorData.text,
        borderRadius: DESIGN_TOKENS.borderRadius.small,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
      }}
      {...props}
    >
      {showIcon && (
        <span style={{ fontSize: sizing.iconSize }}>{colorData.icon}</span>
      )}
      <span>{colorData.label}</span>
    </div>
  );
}

// Badge de tipo de falta (expedientes disciplinarios)
export interface TipoFaltaBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tipo: 'Leve' | 'Grave' | 'Gravísima';
  size?: 'small' | 'medium' | 'large';
}

export function TipoFaltaBadge({
  tipo,
  size = 'medium',
  className = '',
  ...props
}: TipoFaltaBadgeProps) {
  const colorMap = {
    Leve: {
      bg: '#DBEAFE',
      text: '#1E40AF',
    },
    Grave: {
      bg: '#FEF3C7',
      text: '#92400E',
    },
    Gravísima: {
      bg: '#FEE2E2',
      text: '#991B1B',
    },
  };

  const colors = colorMap[tipo];

  const sizeStyles = {
    small: {
      padding: '2px 6px',
      fontSize: '10px',
    },
    medium: {
      padding: '4px 8px',
      fontSize: '11px',
    },
    large: {
      padding: '6px 12px',
      fontSize: '12px',
    },
  };

  const sizing = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center justify-center font-bold uppercase rounded ${className}`}
      style={{
        ...sizing,
        ...colors,
        borderRadius: DESIGN_TOKENS.borderRadius.small,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
        lineHeight: 1,
      }}
      {...props}
    >
      {tipo}
    </span>
  );
}

// Badge de urgencia
export interface UrgenciaBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  urgente: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function UrgenciaBadge({
  urgente,
  size = 'medium',
  className = '',
  ...props
}: UrgenciaBadgeProps) {
  if (!urgente) return null;

  const sizeStyles = {
    small: {
      padding: '2px 6px',
      fontSize: '10px',
    },
    medium: {
      padding: '4px 8px',
      fontSize: '11px',
    },
    large: {
      padding: '6px 12px',
      fontSize: '12px',
    },
  };

  const sizing = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase rounded ${className}`}
      style={{
        ...sizing,
        background: DESIGN_TOKENS.colors.status.red,
        color: DESIGN_TOKENS.colors.primary.white,
        borderRadius: DESIGN_TOKENS.borderRadius.small,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
        lineHeight: 1,
      }}
      {...props}
    >
      <span>⚠️</span>
      <span>URGENTE</span>
    </span>
  );
}