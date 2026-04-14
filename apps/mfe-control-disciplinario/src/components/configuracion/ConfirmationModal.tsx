import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
  disableClose?: boolean;
}

export function ConfirmationModal({
  open,
  onClose,
  children,
  contentClassName = 'max-w-lg',
  disableClose = false,
}: ConfirmationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || disableClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, disableClose, onClose]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const appRoot =
      document.getElementById('root') ||
      document.querySelector('#app') ||
      document.body.firstElementChild;
    const previousRootFilter = appRoot instanceof HTMLElement ? appRoot.style.filter : '';
    const previousRootTransition =
      appRoot instanceof HTMLElement ? appRoot.style.transition : '';
    const previousRootPointerEvents =
      appRoot instanceof HTMLElement ? appRoot.style.pointerEvents : '';

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (appRoot instanceof HTMLElement) {
      appRoot.style.transition = previousRootTransition
        ? `${previousRootTransition}, filter 160ms ease`
        : 'filter 160ms ease';
      appRoot.style.filter = 'brightness(0.52)';
      appRoot.style.pointerEvents = 'none';
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      if (appRoot instanceof HTMLElement) {
        appRoot.style.filter = previousRootFilter;
        appRoot.style.transition = previousRootTransition;
        appRoot.style.pointerEvents = previousRootPointerEvents;
      }
    };
  }, [open]);

  if (!mounted || !open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 isolate z-[2147483646]">
      <div
        className="absolute inset-0 bg-black/45"
        onClick={() => {
          if (!disableClose) onClose();
        }}
      />

      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className={`relative z-[2147483647] w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_40px_100px_rgba(15,23,42,0.45)] ${contentClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          {!disableClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label="Cerrar modal"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
