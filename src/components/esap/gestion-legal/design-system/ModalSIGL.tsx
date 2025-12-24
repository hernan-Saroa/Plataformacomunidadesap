/**
 * ModalSIGL - Componente Modal del Design System ESAP
 * Wrapper sobre Dialog de shadcn/ui con estilos corporativos
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
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  children: React.ReactNode;
}

const sizeClasses = {
  small: 'max-w-md',
  medium: 'max-w-lg',
  large: 'max-w-2xl',
  xlarge: 'max-w-4xl',
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
      <DialogContent className={sizeClasses[size]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || ' '}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}