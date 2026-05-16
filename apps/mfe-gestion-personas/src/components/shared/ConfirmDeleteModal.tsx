/**
 * CONFIRM DELETE MODAL — Modal de confirmación para eliminar documentos
 * 
 * Componente reutilizable que muestra una confirmación antes de eliminar
 * un documento. Usa createPortal para renderizar sobre todo el contenido.
 * 
 * 100% inline styles, coherente con el sistema de diseño ESAP.
 * 
 * @version 1.0.0
 * @date 2026-03-09
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Loader2, FileText } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  documentName: string;
  documentCategory?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  documentName,
  documentCategory,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button on open for accessibility
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => confirmBtnRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isDeleting, onCancel]);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: 24,
          }}
          onClick={() => { if (!isDeleting) onCancel(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
            style={{
              background: 'white', borderRadius: 16,
              boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
              width: 420, maxWidth: '100%', overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with warning icon */}
            <div style={{
              padding: '24px 24px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#FEF2F2', border: '1px solid #FECACA',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertTriangle style={{ width: 22, height: 22, color: '#DC2626' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1F2937', margin: 0, lineHeight: 1.3 }}>
                  Eliminar documento
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '6px 0 0', lineHeight: 1.5 }}>
                  Esta acción no se puede deshacer. El documento será eliminado permanentemente del sistema.
                </p>
              </div>
              <button
                onClick={onCancel}
                disabled={isDeleting}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: 'none', background: '#F3F4F6',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, opacity: isDeleting ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
              >
                <X style={{ width: 16, height: 16, color: '#6B7280' }} />
              </button>
            </div>

            {/* Document info card */}
            <div style={{ padding: '0 24px 20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10,
                background: '#FEF2F2', border: '1px solid #FECACA',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: '#FEE2E2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FileText style={{ width: 18, height: 18, color: '#DC2626' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 700, color: '#1F2937',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    margin: 0,
                  }}>
                    {documentName}
                  </p>
                  {documentCategory && (
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                      {documentCategory}
                    </p>
                  )}
                </div>
                <Trash2 style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0 }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #F3F4F6',
              background: '#FAFBFC',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button
                onClick={onCancel}
                disabled={isDeleting}
                style={{
                  height: 38, padding: '0 20px', borderRadius: 10,
                  border: '1px solid #E5E7EB', background: 'white',
                  color: '#374151', fontSize: 13, fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                Cancelar
              </button>
              <button
                ref={confirmBtnRef}
                onClick={handleConfirm}
                disabled={isDeleting}
                style={{
                  height: 38, padding: '0 20px', borderRadius: 10,
                  border: 'none', background: isDeleting ? '#EF4444' : '#DC2626',
                  color: 'white', fontSize: 13, fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  opacity: isDeleting ? 0.85 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 style={{ width: 14, height: 14 }} />
                    Eliminar documento
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
