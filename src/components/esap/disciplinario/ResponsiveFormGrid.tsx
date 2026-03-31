/**
 * RESPONSIVE FORM GRID - World-Class UX
 * Sistema de grid para formularios que se adapta automáticamente:
 * - Mobile: 1 columna (todos los campos full-width)
 * - Tablet: 2 columnas
 * - Desktop: 2-3 columnas según especificado
 * - Large Desktop: 3-4 columnas
 */

import { useResponsive } from './hooks/useResponsive';

interface ResponsiveFormGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: 1;
    tablet?: 1 | 2;
    desktop?: 1 | 2 | 3;
    large?: 1 | 2 | 3 | 4;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveFormGrid({
  children,
  columns = {
    mobile: 1,
    tablet: 2,
    desktop: 2,
    large: 3,
  },
  gap = 'md',
  className = '',
}: ResponsiveFormGridProps) {
  const { isMobile, isTablet, isLargeDesktop } = useResponsive();

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const getGridColumns = () => {
    if (isMobile) return columns.mobile || 1;
    if (isTablet) return columns.tablet || 2;
    if (isLargeDesktop) return columns.large || 3;
    return columns.desktop || 2;
  };

  const gridCols = getGridColumns();

  return (
    <div
      className={`grid ${gapClasses[gap]} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Campo de formulario que puede ocupar múltiples columnas
 */
export function FormField({
  children,
  fullWidth = false,
  colSpan,
  className = '',
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
  colSpan?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    large?: number;
  };
  className?: string;
}) {
  const { isMobile, isTablet, isLargeDesktop } = useResponsive();

  const getColSpan = () => {
    if (fullWidth) return 'full';
    if (!colSpan) return 'auto';
    
    if (isMobile) return colSpan.mobile || 1;
    if (isTablet) return colSpan.tablet || 1;
    if (isLargeDesktop) return colSpan.large || 1;
    return colSpan.desktop || 1;
  };

  const span = getColSpan();

  return (
    <div
      className={className}
      style={{
        gridColumn: span === 'full' ? '1 / -1' : span === 'auto' ? 'auto' : `span ${span}`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Grupo de campos con label
 */
export function FormFieldGroup({
  label,
  required = false,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { isMobile } = useResponsive();

  return (
    <div className="w-full">
      <label className={`block font-bold text-gray-700 mb-1.5 ${isMobile ? 'text-xs' : 'text-sm'}`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
          {hint}
        </p>
      )}
      {error && (
        <p className={`text-red-500 mt-1 font-semibold ${isMobile ? 'text-xs' : 'text-xs'}`}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Sección de formulario con título
 */
export function FormSection({
  title,
  subtitle,
  children,
  collapsible = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const { isMobile } = useResponsive();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="w-full">
      <div
        className={`border-b-2 border-gray-200 pb-2 mb-4 ${
          collapsible ? 'cursor-pointer' : ''
        }`}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <h3
          className={`font-bold text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}
          style={{ color: '#003DA5' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className={`text-gray-600 mt-0.5 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {subtitle}
          </p>
        )}
      </div>
      {!isCollapsed && children}
    </div>
  );
}

/**
 * Botones de acción responsive
 */
export function FormActions({
  children,
  align = 'right',
  stack = false, // Apilar en móvil
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  stack?: boolean;
}) {
  const { isMobile } = useResponsive();

  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div
      className={`flex ${
        isMobile && stack ? 'flex-col' : 'flex-row'
      } gap-2 ${alignClasses[align]} w-full`}
    >
      {children}
    </div>
  );
}

// Importar React para useState
import React from 'react';
