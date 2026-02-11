/**
 * ModalSIGL - Componente Modal del Design System ESAP
 * Wrapper sobre Dialog de shadcn/ui con estilos corporativos
 * 
 * 🎯 TAMAÑOS ESTANDARIZADOS ESAP 2025:
 * - small:  Confirmaciones, alertas simples (max-w-md = 448px)
 * - medium: Formularios simples, notas (max-w-2xl = 672px)
 * - large:  Formularios complejos, comunicaciones (max-w-4xl = 896px)
 * - xlarge: Tablas, listas con columnas (max-w-5xl = 1024px)
 * - full:   Expedientes completos, dashboards (max-w-6xl = 1152px)
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';

interface ModalSIGLProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'full';
  children: React.ReactNode;
}

const sizeClasses = {
  small: 'w-full max-w-[95vw] sm:max-w-md',           // 448px - Confirmaciones
  medium: 'w-full max-w-[95vw] sm:max-w-2xl',         // 672px - Formularios simples
  large: 'w-full max-w-[95vw] sm:max-w-4xl',          // 896px - Formularios complejos
  xlarge: 'w-full max-w-[95vw] sm:max-w-5xl',         // 1024px - Tablas
  full: 'w-full max-w-[98vw] sm:max-w-6xl',           // 1152px - Expedientes completos
};

export function ModalSIGL({
  isOpen,
  onClose,
  title,
  description,
  size = 'medium',
  children,
}: ModalSIGLProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent hideCloseButton className={`${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-600">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}