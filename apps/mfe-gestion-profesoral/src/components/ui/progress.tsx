/**
 * ============================================
 * PROGRESS - BARRA DE PROGRESO
 * ============================================
 * 
 * Componente para mostrar el progreso de operaciones.
 * 
 * CARACTERÍSTICAS:
 * 1. Barra de progreso animada
 * 2. Variantes de color
 * 3. Con/sin etiqueta de porcentaje
 * 4. Tamaños personalizables
 * 5. Modo indeterminado
 */

import { motion } from 'motion/react';

// ============ TIPOS ============

export interface ProgressProps {
  value?: number; // 0-100
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  indeterminate?: boolean;
  className?: string;
}

// ============ CONFIGURACIÓN ============

const VARIANT_COLORS = {
  default: '#003DA5',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#3b82f6'
};

const SIZE_CONFIG = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4'
};

// ============ COMPONENTE PRINCIPAL ============

export function Progress({
  value = 0,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  indeterminate = false,
  className = ''
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const color = VARIANT_COLORS[variant];

  return (
    <div className={`w-full ${className}`}>
      {/* Label opcional */}
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progreso'}
          </span>
          {showLabel && !indeterminate && (
            <span className="text-sm font-bold" style={{ color }}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      {/* Barra de progreso */}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${SIZE_CONFIG[size]}`}>
        {indeterminate ? (
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ) : (
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </div>
    </div>
  );
}

// ============ VARIANTES ESPECÍFICAS ============

/**
 * Barra de progreso circular
 */
export function CircularProgress({
  value = 0,
  max = 100,
  size = 64,
  strokeWidth = 4,
  variant = 'default',
  showLabel = true
}: {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  showLabel?: boolean;
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const color = VARIANT_COLORS[variant];

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Círculo de fondo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Círculo de progreso */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference
          }}
        />
      </svg>
      {/* Label central */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Barra de progreso con pasos
 */
export function StepProgress({
  currentStep,
  totalSteps,
  steps,
  variant = 'default'
}: {
  currentStep: number;
  totalSteps: number;
  steps?: string[];
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const color = VARIANT_COLORS[variant];

  return (
    <div className="w-full">
      {/* Barra de progreso */}
      <div className="relative">
        {/* Línea de fondo */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2" />
        
        {/* Línea de progreso */}
        <motion.div
          className="absolute top-1/2 left-0 h-1 -translate-y-1/2"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.5 }}
        />

        {/* Puntos de paso */}
        <div className="relative flex justify-between">
          {Array.from({ length: totalSteps + 1 }).map((_, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={index} className="flex flex-col items-center">
                <motion.div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 ${
                    isCompleted || isCurrent
                      ? 'border-transparent'
                      : 'border-gray-300 bg-white'
                  }`}
                  style={{
                    backgroundColor: isCompleted || isCurrent ? color : undefined
                  }}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className={`text-sm font-bold ${
                    isCompleted || isCurrent ? 'text-white' : 'text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                </motion.div>
                {steps && steps[index] && (
                  <span className={`text-xs mt-2 text-center max-w-[80px] ${
                    isCompleted || isCurrent ? 'font-medium' : 'text-gray-500'
                  }`}>
                    {steps[index]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
