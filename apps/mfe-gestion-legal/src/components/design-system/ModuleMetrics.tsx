/**
 * ModuleMetrics.tsx - COMPONENTE REUTILIZABLE PARA MÉTRICAS
 * Parte del Design System ESAP - Backoffice Gestión Legal
 * ✅ RESPONSIVE MOBILE-FIRST con useResponsive hook
 */

import React from 'react';
import { Card } from '@esap-mfe/shared-ui/card';
import { LucideIcon } from 'lucide-react';
import { useResponsive } from '@esap-mfe/shared-hooks/useResponsive';

// ==================== TYPES ====================

export interface MetricConfig {
  /** Valor numérico o texto a mostrar (ej: 248, "85%", "$1.2M") */
  value: number | string;
  
  /** Etiqueta descriptiva (ej: "Expedientes", "Críticos") */
  label: string;
  
  /** Icono de Lucide React */
  icon: React.ReactNode;
  
  /** Color del tema (predefinido o custom) */
  color: 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange' | 'gray' | string;
  
  /** Etiqueta corta para mobile (opcional, por defecto usa 'label') */
  labelMobile?: string;
  
  /** Sufijo para el valor (ej: "%", "M", "K") */
  suffix?: string;
  
  /** Mostrar tendencia (opcional) */
  trend?: {
    value: number; // +5, -3
    label?: string; // "vs mes anterior"
  };
  
  /** Click handler (opcional) */
  onClick?: () => void;
}

export interface ModuleMetricsProps {
  /** Array de métricas a mostrar (2-4 recomendado) */
  metrics: MetricConfig[];
  
  /** Columnas en diferentes breakpoints */
  columns?: {
    mobile?: number;    // default: 2
    tablet?: number;    // default: 3
    desktop?: number;   // default: metrics.length
  };
}

// ==================== COLOR SCHEMES ====================

const COLOR_SCHEMES = {
  blue: {
    bg: '#E0EDFF',
    iconColor: '#003DA5',
    textColor: '#003DA5'
  },
  red: {
    bg: '#FEE2E2',
    iconColor: '#DC2626',
    textColor: '#DC2626'
  },
  green: {
    bg: '#D1FAE5',
    iconColor: '#10B981',
    textColor: '#10B981'
  },
  yellow: {
    bg: '#FEF3C7',
    iconColor: '#F59E0B',
    textColor: '#F59E0B'
  },
  purple: {
    bg: '#F3E8FF',
    iconColor: '#9333EA',
    textColor: '#9333EA'
  },
  orange: {
    bg: '#FFEDD5',
    iconColor: '#FF6B00',
    textColor: '#FF6B00'
  },
  gray: {
    bg: '#F3F4F6',
    iconColor: '#6B7280',
    textColor: '#6B7280'
  }
};

// ==================== COMPONENT ====================

export function ModuleMetrics({ 
  metrics, 
  columns = { mobile: 2, tablet: 3 } 
}: ModuleMetricsProps) {
  // ✅ Hook responsive mejorado
  const { isMobile, isTablet, isDesktop, isLarge } = useResponsive();

  // Determinar columnas según breakpoint
  const getGridCols = () => {
    if (isMobile) return columns.mobile || 2;
    if (isTablet) return columns.tablet || 3;
    if (isDesktop) return columns.desktop || metrics.length;
    return columns.desktop || metrics.length; // 4K usa mismo que desktop
  };

  const gridCols = getGridCols();

  return (
    <div 
      className="grid gap-2 sm:gap-3"
      style={{
        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
      }}
    >
      {metrics.map((metric, index) => (
        <MetricCard 
          key={index} 
          metric={metric} 
          isMobile={isMobile}
          isTablet={isTablet}
          isLarge={isLarge}
        />
      ))}
    </div>
  );
}

// ==================== METRIC CARD ====================

interface MetricCardProps {
  metric: MetricConfig;
  isMobile: boolean;
  isTablet: boolean;
  isLarge: boolean;
}

function MetricCard({ metric, isMobile, isTablet, isLarge }: MetricCardProps) {
  const colorScheme = typeof metric.color === 'string' && COLOR_SCHEMES[metric.color as keyof typeof COLOR_SCHEMES]
    ? COLOR_SCHEMES[metric.color as keyof typeof COLOR_SCHEMES]
    : { bg: '#F3F4F6', iconColor: '#6B7280', textColor: '#6B7280' };

  const displayLabel = isMobile && metric.labelMobile 
    ? metric.labelMobile 
    : metric.label;

  return (
    <Card 
      className={`bg-white border border-gray-200 hover:shadow-md transition-all ${
        metric.onClick ? 'cursor-pointer' : ''
      }`}
      onClick={metric.onClick}
    >
      <div className={`flex items-center ${isMobile ? 'gap-2 p-2.5' : 'gap-3 p-3'}`}>
        {/* Icono */}
        <div 
          className={`${isMobile ? 'p-2' : 'p-2.5'} rounded-lg flex-shrink-0`}
          style={{ background: colorScheme.bg }}
        >
          <div 
            className={`${isMobile ? 'w-4 h-4' : isTablet ? 'w-4.5 h-4.5' : 'w-5 h-5'}`}
            style={{ color: colorScheme.iconColor }}
          >
            {metric.icon}
          </div>
        </div>

        {/* Valor y Label */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p 
              className="font-black text-gray-900 leading-none"
              style={{ 
                fontSize: isMobile ? '1.5rem' : isTablet ? '1.625rem' : '1.75rem' 
              }}
            >
              {metric.value}
            </p>
            
            {/* Sufijo (opcional) */}
            {metric.suffix && (
              <span 
                className={`text-xs font-semibold ${
                  metric.color
                }`}
              >
                {metric.suffix}
              </span>
            )}
            
            {/* Tendencia (opcional) */}
            {metric.trend && (
              <span 
                className={`text-xs font-semibold ${
                  metric.trend.value > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metric.trend.value > 0 ? '+' : ''}{metric.trend.value}%
              </span>
            )}
          </div>

          <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-0.5 truncate`}>
            {displayLabel}
          </p>

          {/* Subtítulo de tendencia (opcional) */}
          {metric.trend?.label && !isMobile && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {metric.trend.label}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ==================== EXPORTS ====================

export default ModuleMetrics;
