/**
 * SemaforoTermino - Componente de semáforo visual para términos
 * Colores mandatorios según DISE_O_UX_UI_SIGL_v5_MVP_CORREGIDO.md
 */

import React from 'react';
import { Clock, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { SIGL_COLORS } from './tokens';

interface SemaforoTerminoProps {
  diasRestantes: number;
  diasTotales: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function SemaforoTermino({
  diasRestantes,
  diasTotales,
  size = 'md',
  showLabel = true,
  showIcon = true,
  className = '',
}: SemaforoTerminoProps) {
  // Calcular porcentaje de tiempo restante
  const porcentajeRestante = diasTotales > 0 ? (diasRestantes / diasTotales) * 100 : 0;

  // Determinar estado según porcentaje
  let estado: {
    color: string;
    bgColor: string;
    label: string;
    icon: React.ElementType;
    animate: boolean;
  };

  if (diasRestantes <= 0) {
    // ❌ VENCIDO (Crítico - Rojo oscuro pulsante)
    estado = {
      color: SIGL_COLORS.semaforoCritico,
      bgColor: `${SIGL_COLORS.semaforoCritico}15`, // 15% opacity
      label: 'VENCIDO',
      icon: XCircle,
      animate: true,
    };
  } else if (porcentajeRestante < 25) {
    // 🔴 URGENTE (< 25% del plazo)
    estado = {
      color: SIGL_COLORS.semaforoRojo,
      bgColor: `${SIGL_COLORS.semaforoRojo}15`,
      label: 'URGENTE',
      icon: AlertCircle,
      animate: false,
    };
  } else if (porcentajeRestante < 50) {
    // 🟡 ATENCIÓN (25-50% del plazo)
    estado = {
      color: SIGL_COLORS.semaforoAmarillo,
      bgColor: `${SIGL_COLORS.semaforoAmarillo}15`,
      label: 'ATENCIÓN',
      icon: AlertTriangle,
      animate: false,
    };
  } else {
    // 🟢 AL DÍA (> 50% del plazo)
    estado = {
      color: SIGL_COLORS.semaforoVerde,
      bgColor: `${SIGL_COLORS.semaforoVerde}15`,
      label: 'AL DÍA',
      icon: Clock,
      animate: false,
    };
  }

  // Tamaños
  const sizes = {
    sm: { dot: 8, icon: 14, fontSize: 10, padding: 4 },
    md: { dot: 10, icon: 16, fontSize: 12, padding: 6 },
    lg: { dot: 12, icon: 18, fontSize: 14, padding: 8 },
  };

  const currentSize = sizes[size];
  const Icon = estado.icon;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Indicador circular (semáforo) */}
      <div
        className={`rounded-full ${estado.animate ? 'animate-pulse' : ''}`}
        style={{
          width: currentSize.dot,
          height: currentSize.dot,
          backgroundColor: estado.color,
          boxShadow: `0 0 8px ${estado.color}40`,
        }}
      />

      {/* Texto con días restantes */}
      <span
        style={{
          fontSize: currentSize.fontSize,
          fontWeight: 600,
          color: estado.color,
        }}
      >
        {diasRestantes > 0 ? `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}` : estado.label}
      </span>

      {/* Ícono opcional */}
      {showIcon && (
        <Icon
          size={currentSize.icon}
          style={{ color: estado.color }}
          className={estado.animate ? 'animate-pulse' : ''}
        />
      )}

      {/* Label opcional */}
      {showLabel && diasRestantes > 0 && (
        <span
          style={{
            fontSize: currentSize.fontSize,
            fontWeight: 500,
            color: SIGL_COLORS.textSecondary,
          }}
        >
          ({estado.label})
        </span>
      )}
    </div>
  );
}

/**
 * SemaforoCard - Versión compacta para tarjetas Kanban
 */
interface SemaforoCardProps {
  diasRestantes: number;
  diasTotales: number;
  className?: string;
}

export function SemaforoCard({ diasRestantes, diasTotales, className = '' }: SemaforoCardProps) {
  return (
    <SemaforoTermino
      diasRestantes={diasRestantes}
      diasTotales={diasTotales}
      size="sm"
      showLabel={false}
      showIcon={false}
      className={className}
    />
  );
}

/**
 * BarraProgresoTermino - Barra de progreso visual
 */
interface BarraProgresoTerminoProps {
  diasRestantes: number;
  diasTotales: number;
  height?: number;
  showPercentage?: boolean;
  className?: string;
}

export function BarraProgresoTermino({
  diasRestantes,
  diasTotales,
  height = 8,
  showPercentage = false,
  className = '',
}: BarraProgresoTerminoProps) {
  const porcentajeRestante = Math.max(0, Math.min(100, (diasRestantes / diasTotales) * 100));

  // Determinar color según porcentaje
  let color: string;
  if (diasRestantes <= 0) {
    color = SIGL_COLORS.semaforoCritico;
  } else if (porcentajeRestante < 25) {
    color = SIGL_COLORS.semaforoRojo;
  } else if (porcentajeRestante < 50) {
    color = SIGL_COLORS.semaforoAmarillo;
  } else {
    color = SIGL_COLORS.semaforoVerde;
  }

  return (
    <div className={className}>
      {/* Barra de fondo */}
      <div
        style={{
          width: '100%',
          height,
          backgroundColor: SIGL_COLORS.gris200,
          borderRadius: height / 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Barra de progreso */}
        <div
          style={{
            width: `${porcentajeRestante}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 300ms ease-in-out',
          }}
          className={diasRestantes <= 0 ? 'animate-pulse' : ''}
        />
      </div>

      {/* Porcentaje opcional */}
      {showPercentage && (
        <div className="flex justify-between mt-1">
          <span style={{ fontSize: 10, color: SIGL_COLORS.textSecondary }}>
            {diasRestantes} de {diasTotales} días
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color }}>
            {Math.round(porcentajeRestante)}%
          </span>
        </div>
      )}
    </div>
  );
}
