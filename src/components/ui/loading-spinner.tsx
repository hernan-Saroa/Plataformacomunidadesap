/**
 * ============================================
 * LOADING SPINNER - COMPONENTE REUTILIZABLE
 * ============================================
 * 
 * Spinner de carga con múltiples variantes y tamaños.
 * 
 * CARACTERÍSTICAS:
 * 1. 4 tamaños (xs, sm, md, lg)
 * 2. 3 variantes (spinner, dots, pulse)
 * 3. Colores personalizables
 * 4. Con/sin overlay
 * 5. Mensaje opcional
 */

import { motion } from 'motion/react';

// ============ TIPOS ============

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse';

export interface LoadingSpinnerProps {
  size?: LoadingSize;
  variant?: LoadingVariant;
  color?: string;
  message?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}

// ============ CONFIGURACIÓN ============

const SIZE_CONFIG = {
  xs: { spinner: 'w-4 h-4', dots: 'w-2 h-2', text: 'text-xs' },
  sm: { spinner: 'w-6 h-6', dots: 'w-3 h-3', text: 'text-sm' },
  md: { spinner: 'w-10 h-10', dots: 'w-4 h-4', text: 'text-base' },
  lg: { spinner: 'w-16 h-16', dots: 'w-6 h-6', text: 'text-lg' }
};

// ============ COMPONENTES DE VARIANTES ============

function SpinnerVariant({ size, color }: { size: LoadingSize; color: string }) {
  return (
    <motion.div
      className={`${SIZE_CONFIG[size].spinner} border-4 border-t-transparent rounded-full`}
      style={{ borderColor: `${color}30`, borderTopColor: color }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  );
}

function DotsVariant({ size, color }: { size: LoadingSize; color: string }) {
  const dotSize = SIZE_CONFIG[size].dots;
  
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${dotSize} rounded-full`}
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15
          }}
        />
      ))}
    </div>
  );
}

function PulseVariant({ size, color }: { size: LoadingSize; color: string }) {
  const pulseSize = SIZE_CONFIG[size].spinner;
  
  return (
    <div className="relative">
      <motion.div
        className={`${pulseSize} rounded-full`}
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 0.3, 0.7]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity
        }}
      />
      <motion.div
        className={`${pulseSize} rounded-full absolute inset-0`}
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity
        }}
      />
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function LoadingSpinner({
  size = 'md',
  variant = 'spinner',
  color = '#003DA5',
  message,
  overlay = false,
  fullScreen = false
}: LoadingSpinnerProps) {
  const LoadingComponent = () => {
    let VariantComponent;
    
    switch (variant) {
      case 'dots':
        VariantComponent = DotsVariant;
        break;
      case 'pulse':
        VariantComponent = PulseVariant;
        break;
      default:
        VariantComponent = SpinnerVariant;
    }
    
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <VariantComponent size={size} color={color} />
        {message && (
          <p className={`${SIZE_CONFIG[size].text} font-medium`} style={{ color }}>
            {message}
          </p>
        )}
      </div>
    );
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <LoadingComponent />
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
        <LoadingComponent />
      </div>
    );
  }

  return <LoadingComponent />;
}

// ============ VARIANTES ESPECÍFICAS ============

export function ButtonLoading({ size = 'xs' }: { size?: LoadingSize }) {
  return <LoadingSpinner size={size} variant="spinner" color="currentColor" />;
}

export function CardLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="md" variant="spinner" message={message} />
    </div>
  );
}

export function FullPageLoading({ message = 'Cargando...' }: { message?: string }) {
  return <LoadingSpinner size="lg" variant="spinner" message={message} fullScreen />;
}
