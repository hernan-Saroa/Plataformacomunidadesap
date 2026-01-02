/**
 * ModalSIGLPremium - Componente base para modales corporativos ESAP 2025
 * ✅ Diseño premium estandarizado con header destacado
 * ✅ Footer con botones de acción siempre visibles
 * ✅ Reutilizable para todos los módulos de Gestión Legal
 * 
 * @example
 * ```tsx
 * <ModalSIGLPremium
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Expediente Judicial"
 *   subtitle="25000-23-33-001-2024-00001-00"
 *   icon={<Scale />}
 *   badges={[
 *     { label: 'En Contestación', color: '#003DA5' },
 *     { label: '15 días restantes', color: '#F59E0B' }
 *   ]}
 *   footerActions={
 *     <>
 *       <Button onClick={onClose}>Cerrar</Button>
 *       <Button onClick={onSave}>Guardar</Button>
 *     </>
 *   }
 * >
 *   {/* Contenido del modal *\/}
 * </ModalSIGLPremium>
 * ```
 */

import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { X } from 'lucide-react';

interface BadgeConfig {
  label: string;
  color?: string;
  bg?: string;
  icon?: ReactNode;
  className?: string;
}

interface ModalSIGLPremiumProps {
  /** Controla la visibilidad del modal */
  isOpen: boolean;
  
  /** Función para cerrar el modal */
  onClose: () => void;
  
  /** Título principal del modal */
  title: string;
  
  /** Subtítulo o descripción corta */
  subtitle?: string;
  
  /** Icono a mostrar en el header (componente Lucide React) */
  icon?: ReactNode;
  
  /** Badges informativos en el header */
  badges?: BadgeConfig[];
  
  /** Barra de progreso opcional */
  progressBar?: {
    value: number; // 0-100
    label?: string;
    showPercentage?: boolean;
  };
  
  /** Contenido del modal */
  children: ReactNode;
  
  /** Acciones del footer (botones) */
  footerActions?: ReactNode;
  
  /** Información adicional en el footer */
  footerInfo?: ReactNode;
  
  /** Tamaño del modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /** Altura del modal */
  height?: 'auto' | 'full';
  
  /** Color del gradiente del header */
  headerColor?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  
  /** Descripción para accesibilidad */
  ariaDescription?: string;
  
  /** Clase CSS adicional para el contenido */
  contentClassName?: string;
}

const SIZE_CLASSES = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-[95vw]'
};

const HEIGHT_CLASSES = {
  auto: 'max-h-[90vh]',
  full: 'h-[90vh]'
};

const HEADER_GRADIENTS = {
  blue: 'from-blue-600 to-blue-700',
  green: 'from-green-600 to-green-700',
  orange: 'from-orange-600 to-orange-700',
  red: 'from-red-600 to-red-700',
  purple: 'from-purple-600 to-purple-700'
};

export function ModalSIGLPremium({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badges = [],
  progressBar,
  children,
  footerActions,
  footerInfo,
  size = 'xl',
  height = 'full',
  headerColor = 'blue',
  ariaDescription,
  contentClassName = ''
}: ModalSIGLPremiumProps) {
  
  const sizeClass = SIZE_CLASSES[size];
  const heightClass = HEIGHT_CLASSES[height];
  const headerGradient = HEADER_GRADIENTS[headerColor];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${sizeClass} ${height === 'full' ? 'h-[90vh]' : ''} flex flex-col p-0`}
      >
        {ariaDescription && (
          <DialogDescription className="sr-only">
            {ariaDescription}
          </DialogDescription>
        )}
        
        {/* ==================== HEADER ==================== */}
        <div className={`flex-shrink-0 bg-gradient-to-r ${headerGradient} text-white px-6 py-4`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Título e Icono */}
              <div className="flex items-center gap-3 mb-2">
                {icon && (
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                    {icon}
                  </div>
                )}
                <div>
                  <DialogTitle className="text-2xl font-black text-white">
                    {title}
                  </DialogTitle>
                  {subtitle && (
                    <p className="text-sm text-blue-100 mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              
              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {badges.map((badge, idx) => (
                    <Badge 
                      key={idx}
                      className={`font-bold ${badge.className || ''}`}
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        borderColor: badge.color
                      }}
                    >
                      {badge.icon && <span className="mr-1.5">{badge.icon}</span>}
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Botón Cerrar */}
            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="ml-4 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Barra de Progreso */}
          {progressBar && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                {progressBar.label && (
                  <span className="text-xs font-bold text-blue-100">
                    {progressBar.label}
                  </span>
                )}
                {progressBar.showPercentage && (
                  <span className="text-xs font-black text-white">
                    {progressBar.value}%
                  </span>
                )}
              </div>
              <div className="w-full h-2.5 bg-blue-900/30 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 bg-gradient-to-r from-green-400 to-blue-300"
                  style={{ width: `${Math.min(100, Math.max(0, progressBar.value))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ==================== CONTENIDO ==================== */}
        <div className={`flex-1 overflow-y-auto ${contentClassName}`}>
          {children}
        </div>

        {/* ==================== FOOTER ==================== */}
        {(footerActions || footerInfo) && (
          <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-200 px-6 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Información del Footer */}
              {footerInfo && (
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {footerInfo}
                </div>
              )}
              
              {/* Acciones del Footer */}
              {footerActions && (
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  {footerActions}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Ejemplo de uso con configuraciones comunes
 */
export const ModalSIGLPremiumExamples = {
  // Modal de Expediente Judicial
  expediente: {
    size: 'xl' as const,
    height: 'full' as const,
    headerColor: 'blue' as const
  },
  
  // Modal de Proceso Disciplinario
  disciplinario: {
    size: 'xl' as const,
    height: 'full' as const,
    headerColor: 'red' as const
  },
  
  // Modal de Comunicaciones
  comunicaciones: {
    size: 'lg' as const,
    height: 'full' as const,
    headerColor: 'blue' as const
  },
  
  // Modal de Formulario
  formulario: {
    size: 'md' as const,
    height: 'auto' as const,
    headerColor: 'blue' as const
  },
  
  // Modal de Confirmación
  confirmacion: {
    size: 'sm' as const,
    height: 'auto' as const,
    headerColor: 'orange' as const
  }
};
