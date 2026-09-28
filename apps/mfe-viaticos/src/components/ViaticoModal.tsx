import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@esap-mfe/shared-ui';

type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ViaticoModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
  bodyClassName?: string;
  hideCloseButton?: boolean;
}

export function ViaticoModal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  icon,
  header,
  children,
  footer,
  size = 'lg',
  className = '',
  bodyClassName = '',
  hideCloseButton = false,
}: ViaticoModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        size={size}
        hideCloseButton={hideCloseButton}
        className={`rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl ${className}`}
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          {header ? (
            <>
              <DialogTitle className="sr-only">{title}</DialogTitle>
              {description && (
                <DialogDescription className="sr-only">
                  {description}
                </DialogDescription>
              )}
              {header}
            </>
          ) : (
            <div className="flex items-start gap-3 pr-8">
              {icon && (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#003DA5]">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {eyebrow && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                    {eyebrow}
                  </p>
                )}
                <DialogTitle className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription className="mt-1 text-xs leading-relaxed text-slate-500">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className={`max-h-[calc(100vh-10rem)] overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <DialogFooter className="shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
