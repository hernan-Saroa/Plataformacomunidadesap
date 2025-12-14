/**
 * COMPONENTE: DETAIL SHEET
 * 
 * Panel lateral estilo Notion/Linear para mostrar detalles completos
 * - Slide from right
 * - Animaciones premium
 * - Tabs para organizar información
 * - Acciones contextuales
 * - Responsive (fullscreen en mobile)
 * - Accesibilidad WCAG 2.1 AA
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit, Trash2, MoreVertical, ExternalLink } from 'lucide-react';
import { Button } from '../../ui/button';

export interface DetailSheetProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: T | null;
  title?: string;
  children: React.ReactNode;
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }[];
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const widthClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export function DetailSheet<T>({
  open,
  onOpenChange,
  data,
  title = 'Detalles',
  children,
  actions = [],
  width = 'lg',
}: DetailSheetProps<T>) {
  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Keyboard: Escape para cerrar
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!data) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => onOpenChange(false)}
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 40,
              mass: 1
            }}
            className={`fixed right-0 top-0 h-full w-full ${widthClasses[width]} bg-white shadow-2xl z-[70] flex flex-col`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Actions */}
                  {actions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant={action.variant || 'outline'}
                      size="sm"
                      onClick={action.onClick}
                      className="gap-2"
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}

                  {/* Close button */}
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Field component para mostrar información estructurada
export function DetailField({ 
  label, 
  value, 
  fullWidth = false 
}: { 
  label: string; 
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <dt className="text-sm font-semibold text-gray-600 mb-1">
        {label}
      </dt>
      <dd className="text-sm text-gray-900">
        {value || <span className="text-gray-400">-</span>}
      </dd>
    </div>
  );
}

// Section component para agrupar campos
export function DetailSection({ 
  title, 
  children,
  collapsible = false 
}: { 
  title: string; 
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">
          {title}
        </h3>
        {collapsible && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {collapsed ? 'Expandir' : 'Colapsar'}
          </button>
        )}
      </div>
      
      {!collapsed && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children}
        </dl>
      )}
    </div>
  );
}
