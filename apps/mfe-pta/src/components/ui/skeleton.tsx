/**
 * ============================================
 * SKELETON LOADERS
 * ============================================
 * 
 * Componentes skeleton para mostrar mientras se cargan datos.
 * 
 * CARACTERÍSTICAS:
 * 1. Animación de pulso suave
 * 2. Variantes predefinidas (tarjeta, lista, tabla)
 * 3. Totalmente personalizables
 * 4. Responsive
 */

import { motion } from 'motion/react';

// ============ COMPONENTE BASE ============

export interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  animation?: boolean;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = true
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200';
  
  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4'
  };

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
  };

  if (animation) {
    return (
      <motion.div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
        animate={{
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// ============ VARIANTES PREDEFINIDAS ============

/**
 * Skeleton de tarjeta de revisión (para el Kanban)
 */
export function SkeletonRevisionCard() {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="circular" width={24} height={24} />
      </div>

      {/* Código */}
      <Skeleton variant="rectangular" width="40%" height={24} className="rounded-full" />

      {/* Título */}
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="70%" />

      {/* Metadata */}
      <div className="flex gap-2 flex-wrap">
        <Skeleton variant="rectangular" width={80} height={20} className="rounded-full" />
        <Skeleton variant="rectangular" width={100} height={20} className="rounded-full" />
        <Skeleton variant="rectangular" width={60} height={20} className="rounded-full" />
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={100} />
        </div>
        <Skeleton variant="rectangular" width={60} height={20} className="rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton de lista de aprobaciones
 */
export function SkeletonAprobacionItem() {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Skeleton variant="circular" width={48} height={48} />
        
        {/* Contenido */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width={200} />
            <Skeleton variant="rectangular" width={80} height={24} className="rounded-full" />
          </div>
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="60%" />
          
          {/* Metadata */}
          <div className="flex gap-3 mt-3">
            <Skeleton variant="text" width={100} />
            <Skeleton variant="text" width={120} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton de nota
 */
export function SkeletonNota() {
  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton variant="rectangular" width={80} height={24} className="rounded-full" />
          <Skeleton variant="rectangular" width={100} height={24} className="rounded-full" />
        </div>
        <div className="flex gap-1">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </div>
      </div>

      {/* Contenido */}
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="95%" />
        <Skeleton variant="text" width="80%" />
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-200 flex gap-4">
        <Skeleton variant="text" width={150} />
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={80} />
      </div>
    </div>
  );
}

/**
 * Skeleton de tabla
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} variant="text" height={20} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4 py-3 border-t border-gray-200"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} variant="text" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton de formulario
 */
export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" width={150} height={16} />
          <Skeleton variant="rectangular" width="100%" height={40} />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton de estadísticas (para la bandeja de aprobaciones)
 */
export function SkeletonEstadisticas() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-3">
          <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={32} />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton de timeline (para historial)
 */
export function SkeletonTimeline({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {/* Punto del timeline */}
          <div className="flex flex-col items-center">
            <Skeleton variant="circular" width={40} height={40} />
            {i < items - 1 && (
              <div className="w-0.5 h-16 bg-gray-200 my-2" />
            )}
          </div>

          {/* Contenido */}
          <div className="flex-1 space-y-2 pb-8">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width={200} />
              <Skeleton variant="rectangular" width={80} height={20} className="rounded-full" />
            </div>
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width={150} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton de columna Kanban
 */
export function SkeletonKanbanColumn() {
  return (
    <div className="bg-gray-50 rounded-lg p-4 min-w-[320px] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="circular" width={24} height={24} />
      </div>

      {/* Cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonRevisionCard key={i} />
      ))}
    </div>
  );
}
