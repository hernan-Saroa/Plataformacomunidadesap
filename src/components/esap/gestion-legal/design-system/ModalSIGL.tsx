/**
 * ModalSIGL - Componente Modal del Design System ESAP
 * Wrapper sobre Dialog de shadcn/ui con estilos corporativos
 * Versión mejorada con responsive optimizado
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
  small: 'w-full max-w-[90vw] sm:max-w-md',
  medium: 'w-full max-w-[90vw] sm:max-w-lg',
  large: 'w-full max-w-[95vw] sm:max-w-2xl',
  xlarge: 'w-full max-w-[95vw] sm:max-w-4xl lg:max-w-5xl',
  full: 'w-full max-w-[98vw] sm:max-w-6xl lg:max-w-7xl',
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
          <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
          <DialogDescription className="text-sm">
            {description || ' '}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}