/**
 * BadgeSIGL - Componente de badge/etiqueta para SIGL v5.0
 */

import React from 'react';
import { SIGL_COLORS, SIGL_BORDERS, SIGL_SPACING } from './tokens';

interface BadgeSIGLProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'custom' | 'outline';
  color?: string; // Para variant='custom' y 'outline'
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function BadgeSIGL({
  children,
  variant = 'neutral',
  color,
  size = 'md',
  dot = false,
  icon,
  className = '',
  style = {},
}: BadgeSIGLProps) {
  // Variantes de color
  const variantColors: Record<string, { bg: string; text: string; border: string }> = {
    primary: {
      bg: SIGL_COLORS.primary,
      text: SIGL_COLORS.textWhite,
      border: SIGL_COLORS.primary,
    },
    success: {
      bg: SIGL_COLORS.success,
      text: SIGL_COLORS.textWhite,
      border: SIGL_COLORS.success,
    },
    warning: {
      bg: SIGL_COLORS.warning,
      text: SIGL_COLORS.gris900,
      border: SIGL_COLORS.warning,
    },
    danger: {
      bg: SIGL_COLORS.danger,
      text: SIGL_COLORS.textWhite,
      border: SIGL_COLORS.danger,
    },
    info: {
      bg: SIGL_COLORS.info,
      text: SIGL_COLORS.textWhite,
      border: SIGL_COLORS.info,
    },
    neutral: {
      bg: SIGL_COLORS.gris200,
      text: SIGL_COLORS.textPrimary,
      border: SIGL_COLORS.gris300,
    },
    custom: {
      bg: color || SIGL_COLORS.primary,
      text: SIGL_COLORS.textWhite,
      border: color || SIGL_COLORS.primary,
    },
    outline: {
      bg: 'transparent',
      text: color || SIGL_COLORS.primary,
      border: color || SIGL_COLORS.primary,
    },
  };

  // Tamaños
  const sizeStyles: Record<string, { fontSize: number; padding: string; height: number }> = {
    sm: {
      fontSize: 10,
      padding: `0 ${SIGL_SPACING.xs}px`,
      height: 18,
    },
    md: {
      fontSize: 12,
      padding: `0 ${SIGL_SPACING.sm}px`,
      height: 22,
    },
    lg: {
      fontSize: 14,
      padding: `0 ${SIGL_SPACING.sm}px`,
      height: 26,
    },
  };

  // Normalizar variant para evitar undefined
  const normalizedVariant = variant || 'neutral';
  const normalizedSize = size || 'md';

  const colors = variantColors[normalizedVariant] || variantColors['neutral'];
  const sizes = sizeStyles[normalizedSize] || sizeStyles['md'];

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: SIGL_SPACING.xs,
    backgroundColor: colors.bg,
    color: colors.text,
    border: normalizedVariant === 'outline' ? `1px solid ${colors.border}` : 'none',
    borderRadius: SIGL_BORDERS.radiusBadge,
    fontSize: sizes.fontSize,
    fontWeight: 600,
    padding: sizes.padding,
    height: sizes.height,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...style,
  };

  return (
    <span className={className} style={baseStyles}>
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: colors.text,
          }}
        />
      )}
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

/**
 * BadgeLeyDisciplinaria - Badge específico para mostrar ley aplicable (MOD-02)
 * Selector automático según fecha de hechos: Ley 734/2002 vs Ley 1952/2019
 */
interface BadgeLeyDisciplinariaProps {
  fechaHechos: Date;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BadgeLeyDisciplinaria({ fechaHechos, size = 'md', className = '' }: BadgeLeyDisciplinariaProps) {
  // ⚠️ FECHA CRÍTICA: 29 de marzo de 2022 (vigencia Ley 1952/2019)
  const FECHA_CORTE = new Date('2022-03-29');
  
  const esLey734 = fechaHechos < FECHA_CORTE;
  
  const ley = esLey734 ? 'Ley 734/2002' : 'Ley 1952/2019';
  const color = esLey734 ? SIGL_COLORS.gris600 : SIGL_COLORS.modJuzgamiento;
  
  return (
    <BadgeSIGL variant="custom" color={color} size={size} className={className}>
      {ley}
    </BadgeSIGL>
  );
}

/**
 * BadgeUrgencia - Badge de urgencia para notificaciones (MOD-04)
 */
interface BadgeUrgenciaProps {
  nivel: 'URGENTE' | 'IMPORTANTE' | 'NORMAL';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BadgeUrgencia({ nivel, size = 'md', className = '' }: BadgeUrgenciaProps) {
  const variantMap: Record<string, 'danger' | 'warning' | 'neutral'> = {
    URGENTE: 'danger',
    IMPORTANTE: 'warning',
    NORMAL: 'neutral',
  };
  
  return (
    <BadgeSIGL variant={variantMap[nivel]} size={size} className={className} dot>
      {nivel}
    </BadgeSIGL>
  );
}

/**
 * BadgeModulo - Badge con color específico del módulo
 */
interface BadgeModuloProps {
  modulo: 'defensa-judicial' | 'juzgamiento' | 'asesoria' | 'buzon-notif' | 'terminos';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
}

export function BadgeModulo({ modulo, size = 'md', children, className = '' }: BadgeModuloProps) {
  const moduloColors: Record<string, string> = {
    'defensa-judicial': SIGL_COLORS.modDefensaJudicial,
    'juzgamiento': SIGL_COLORS.modJuzgamiento,
    'asesoria': SIGL_COLORS.modAsesoria,
    'buzon-notif': SIGL_COLORS.modBuzonNotif,
    'terminos': SIGL_COLORS.modTerminos,
  };
  
  const moduloNames: Record<string, string> = {
    'defensa-judicial': 'Defensa Judicial',
    'juzgamiento': 'Juzgamiento',
    'asesoria': 'Asesoría',
    'buzon-notif': 'Buzón Notif.',
    'terminos': 'Términos',
  };
  
  return (
    <BadgeSIGL 
      variant="custom" 
      color={moduloColors[modulo]} 
      size={size} 
      className={className}
    >
      {children || moduloNames[modulo]}
    </BadgeSIGL>
  );
}