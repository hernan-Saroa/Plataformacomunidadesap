/**
 * COMPONENTE: BULK ACTIONS BAR
 * 
 * Barra de acciones masivas para tablas con selección múltiple
 * - Aparece cuando hay elementos seleccionados
 * - Muestra contador de seleccionados
 * - Acciones contextuales según tipo de datos
 * - Animación suave de entrada/salida
 * - Accesibilidad completa (WCAG 2.1 AA)
 * - Estilo premium estilo Linear/Notion
 * 
 * Características:
 * - Fixed bottom bar (mobile-friendly)
 * - Sticky top bar (desktop)
 * - Keyboard navigation
 * - Screen reader announcements
 * - Undo support
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  Download,
  Edit,
  CheckCircle,
  XCircle,
  Archive,
  Send,
  UserPlus,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../ui/button';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  onClick: () => void;
  requiresConfirmation?: boolean;
}

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  position?: 'top' | 'bottom'; // top para desktop, bottom para mobile
  entityName?: string; // "auditorías", "usuarios", "graduados"
}

// Variantes de estilo según tipo de acción
const actionVariants = {
  default: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
  danger: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300',
  success: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-300',
  warning: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border-yellow-300',
};

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onClearSelection,
  actions,
  position = 'bottom',
  entityName = 'elementos',
}: BulkActionsBarProps) {
  const isAllSelected = selectedCount === totalCount;

  // Animaciones premium estilo Linear
  const barVariants = {
    hidden: {
      opacity: 0,
      y: position === 'bottom' ? 100 : -100,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      y: position === 'bottom' ? 100 : -100,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <>
          {/* Anuncio para screen readers */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {selectedCount} {entityName} {selectedCount === 1 ? 'seleccionado' : 'seleccionados'}
          </div>

          {/* Barra de acciones */}
          <motion.div
            variants={barVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed left-0 right-0 z-50 ${
              position === 'bottom'
                ? 'bottom-0 md:bottom-4 md:left-auto md:right-4 md:max-w-2xl'
                : 'top-20 md:top-24'
            }`}
            role="toolbar"
            aria-label="Acciones para elementos seleccionados"
          >
            <div
              className="mx-4 md:mx-0 mb-4 md:mb-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-2xl border border-blue-500/20 backdrop-blur-xl overflow-hidden"
              style={{
                boxShadow:
                  '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(59, 130, 246, 0.3)',
              }}
            >
              {/* Progress bar superior */}
              <motion.div
                className="h-1 bg-blue-400/40"
                initial={{ width: 0 }}
                animate={{ width: `${(selectedCount / totalCount) * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />

              <div className="px-4 py-3 md:px-6 md:py-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Contador y selección */}
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl backdrop-blur-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CheckCircle className="w-5 h-5 text-white" aria-hidden="true" />
                    </motion.div>
                    
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        <span className="tabular-nums">{selectedCount}</span>{' '}
                        {entityName} {selectedCount === 1 ? 'seleccionado' : 'seleccionados'}
                      </p>
                      {isAllSelected && (
                        <p className="text-xs text-blue-100">
                          Todos los {entityName} seleccionados
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Desktop: Mostrar todas las acciones */}
                    <div className="hidden md:flex items-center gap-2">
                      {actions.map((action) => (
                        <motion.button
                          key={action.id}
                          onClick={action.onClick}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all backdrop-blur-sm border border-white/20"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          aria-label={action.label}
                        >
                          <span className="w-4 h-4" aria-hidden="true">
                            {action.icon}
                          </span>
                          <span className="hidden lg:inline">{action.label}</span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Mobile: Menú compacto */}
                    <div className="flex md:hidden items-center gap-2">
                      {actions.slice(0, 2).map((action) => (
                        <motion.button
                          key={action.id}
                          onClick={action.onClick}
                          className="inline-flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all backdrop-blur-sm border border-white/20"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          aria-label={action.label}
                        >
                          <span className="w-5 h-5" aria-hidden="true">
                            {action.icon}
                          </span>
                        </motion.button>
                      ))}
                      {actions.length > 2 && (
                        <motion.button
                          className="inline-flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all backdrop-blur-sm border border-white/20"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          aria-label="Más acciones"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </motion.button>
                      )}
                    </div>

                    {/* Botón cerrar */}
                    <motion.button
                      onClick={onClearSelection}
                      className="inline-flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all backdrop-blur-sm border border-white/20"
                      whileHover={{ scale: 1.05, rotate: 90 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Cancelar selección"
                    >
                      <X className="w-5 h-5" aria-hidden="true" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Overlay sutil para desktop */}
          {position === 'top' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-40 hidden md:block"
              onClick={onClearSelection}
              aria-hidden="true"
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// Preset de acciones comunes

export const commonBulkActions = {
  delete: (onDelete: () => void): BulkAction => ({
    id: 'delete',
    label: 'Eliminar',
    icon: <Trash2 className="w-4 h-4" />,
    variant: 'danger',
    onClick: onDelete,
    requiresConfirmation: true,
  }),

  export: (onExport: () => void): BulkAction => ({
    id: 'export',
    label: 'Exportar',
    icon: <Download className="w-4 h-4" />,
    variant: 'default',
    onClick: onExport,
  }),

  approve: (onApprove: () => void): BulkAction => ({
    id: 'approve',
    label: 'Aprobar',
    icon: <CheckCircle className="w-4 h-4" />,
    variant: 'success',
    onClick: onApprove,
    requiresConfirmation: true,
  }),

  reject: (onReject: () => void): BulkAction => ({
    id: 'reject',
    label: 'Rechazar',
    icon: <XCircle className="w-4 h-4" />,
    variant: 'danger',
    onClick: onReject,
    requiresConfirmation: true,
  }),

  archive: (onArchive: () => void): BulkAction => ({
    id: 'archive',
    label: 'Archivar',
    icon: <Archive className="w-4 h-4" />,
    variant: 'default',
    onClick: onArchive,
  }),

  assign: (onAssign: () => void): BulkAction => ({
    id: 'assign',
    label: 'Asignar',
    icon: <UserPlus className="w-4 h-4" />,
    variant: 'default',
    onClick: onAssign,
  }),

  send: (onSend: () => void): BulkAction => ({
    id: 'send',
    label: 'Enviar',
    icon: <Send className="w-4 h-4" />,
    variant: 'default',
    onClick: onSend,
  }),

  changeStatus: (onChangeStatus: () => void): BulkAction => ({
    id: 'change-status',
    label: 'Cambiar estado',
    icon: <Edit className="w-4 h-4" />,
    variant: 'default',
    onClick: onChangeStatus,
  }),
};
