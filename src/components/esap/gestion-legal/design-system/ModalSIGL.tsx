/**
 * MODAL SIGL - Sistema Integral de Gestión Legal
 * Implementación según especificación DISEÑO_UI_SIGL_DETALLADO_PARA_FIGMA.md
 * Sección 2.5 - Modales
 */

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import DESIGN_TOKENS from './tokens';
import { ButtonSIGL } from './Button';

export interface ModalSIGLProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  headerColor?: string;
  className?: string;
}

export function ModalSIGL({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  headerColor = DESIGN_TOKENS.colors.primary.blue,
  className = '',
}: ModalSIGLProps) {
  // Tamaños de modal
  const sizeMap = {
    small: '400px',
    medium: '600px',
    large: '800px',
  };

  const maxWidth = sizeMap[size];

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, closeOnEsc, onClose]);

  // Bloquear scroll del body cuando modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Renderizar en portal
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            className="fixed inset-0"
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: DESIGN_TOKENS.zIndex.modalOverlay,
            }}
          />

          {/* Modal Box */}
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              zIndex: DESIGN_TOKENS.zIndex.modal,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full rounded-lg overflow-hidden ${className}`}
              style={{
                maxWidth: maxWidth,
                background: DESIGN_TOKENS.colors.primary.white,
                borderRadius: DESIGN_TOKENS.borderRadius.medium,
                boxShadow: DESIGN_TOKENS.shadows.level3,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              {title && (
                <div
                  className="flex items-center justify-between flex-shrink-0"
                  style={{
                    background: headerColor,
                    color: DESIGN_TOKENS.colors.primary.white,
                    padding: '20px',
                    borderBottom: `1px solid ${DESIGN_TOKENS.colors.primary.light}`,
                  }}
                >
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                      margin: 0,
                    }}
                  >
                    {title}
                  </h2>

                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="transition-opacity hover:opacity-70"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: DESIGN_TOKENS.colors.primary.white,
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div
                className="flex-1 overflow-y-auto"
                style={{
                  padding: '24px',
                  fontSize: DESIGN_TOKENS.typography.fontSize.body,
                  lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
                  color: DESIGN_TOKENS.colors.neutral.darkGray,
                }}
              >
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div
                  className="flex items-center justify-end flex-shrink-0"
                  style={{
                    background: DESIGN_TOKENS.colors.neutral.veryLightGray,
                    padding: '16px',
                    borderTop: `1px solid ${DESIGN_TOKENS.colors.primary.light}`,
                    gap: DESIGN_TOKENS.spacing.s,
                  }}
                >
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ========================================
// MODAL DE CONFIRMACIÓN
// ========================================

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const variantConfig = {
    danger: {
      icon: <AlertTriangle size={48} />,
      color: DESIGN_TOKENS.colors.status.red,
      buttonVariant: 'danger' as const,
    },
    warning: {
      icon: <AlertTriangle size={48} />,
      color: DESIGN_TOKENS.colors.status.yellow,
      buttonVariant: 'primary' as const,
    },
    info: {
      icon: <Info size={48} />,
      color: DESIGN_TOKENS.colors.primary.blue,
      buttonVariant: 'primary' as const,
    },
    success: {
      icon: <CheckCircle size={48} />,
      color: DESIGN_TOKENS.colors.status.green,
      buttonVariant: 'success' as const,
    },
  };

  const config = variantConfig[variant];

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      closeOnOverlayClick={!isLoading}
      closeOnEsc={!isLoading}
      showCloseButton={false}
      headerColor={config.color}
      title={title}
      footer={
        <>
          <ButtonSIGL
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </ButtonSIGL>
          <ButtonSIGL
            variant={config.buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {confirmText}
          </ButtonSIGL>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0"
          style={{ color: config.color }}
        >
          {config.icon}
        </div>
        <div className="flex-1">
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.body,
              lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
              color: DESIGN_TOKENS.colors.neutral.darkGray,
            }}
          >
            {message}
          </p>
        </div>
      </div>
    </ModalSIGL>
  );
}

// ========================================
// MODAL DE FORMULARIO
// ========================================

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  children: ReactNode;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  isValid?: boolean;
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  isLoading = false,
  isValid = true,
}: FormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="medium"
      closeOnOverlayClick={!isLoading}
      closeOnEsc={!isLoading}
      footer={
        <>
          <ButtonSIGL
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </ButtonSIGL>
          <ButtonSIGL
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!isValid || isLoading}
          >
            {submitText}
          </ButtonSIGL>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {children}
      </form>
    </ModalSIGL>
  );
}

// ========================================
// MODAL DE INFORMACIÓN
// ========================================

export interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeText?: string;
  variant?: 'info' | 'success' | 'warning';
}

export function InfoModal({
  isOpen,
  onClose,
  title,
  children,
  closeText = 'Cerrar',
  variant = 'info',
}: InfoModalProps) {
  const variantColors = {
    info: DESIGN_TOKENS.colors.primary.blue,
    success: DESIGN_TOKENS.colors.status.green,
    warning: DESIGN_TOKENS.colors.status.yellow,
  };

  return (
    <ModalSIGL
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="large"
      headerColor={variantColors[variant]}
      footer={
        <ButtonSIGL variant="primary" onClick={onClose}>
          {closeText}
        </ButtonSIGL>
      }
    >
      {children}
    </ModalSIGL>
  );
}
