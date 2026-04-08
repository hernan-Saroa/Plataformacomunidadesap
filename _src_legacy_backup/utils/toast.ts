// Toast utility - standalone without external dependencies
// This replaces sonner completely

let toastCallback: ((toast: {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
}) => void) | null = null;

export function setToastCallback(callback: typeof toastCallback) {
  toastCallback = callback;
}

// Sonner-compatible API
export const toast = {
  success: (message: string, options?: { description?: string }) => {
    if (toastCallback) {
      toastCallback({ type: 'success', message, description: options?.description });
    } else {
      console.log('✅', message, options?.description || '');
    }
  },
  error: (message: string, options?: { description?: string }) => {
    if (toastCallback) {
      toastCallback({ type: 'error', message, description: options?.description });
    } else {
      console.error('❌', message, options?.description || '');
    }
  },
  info: (message: string, options?: { description?: string }) => {
    if (toastCallback) {
      toastCallback({ type: 'info', message, description: options?.description });
    } else {
      console.info('ℹ️', message, options?.description || '');
    }
  },
  warning: (message: string, options?: { description?: string }) => {
    if (toastCallback) {
      toastCallback({ type: 'warning', message, description: options?.description });
    } else {
      console.warn('⚠️', message, options?.description || '');
    }
  },
};
