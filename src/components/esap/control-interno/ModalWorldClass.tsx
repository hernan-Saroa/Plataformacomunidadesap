/**
 * ============================================
 * MODAL WORLD CLASS - ESTÁNDAR ESAP
 * ============================================
 * 
 * Modal estandarizado para todo el módulo de Control Interno
 * Basado en el diseño corporativo premium de ESAP
 * 
 * CARACTERÍSTICAS:
 * - Header con ícono, título, código y badges
 * - Contenido flexible (chat, formulario, tabla, etc.)
 * - Footer opcional con acciones
 * - Responsive y mobile-first
 * - Animaciones suaves con motion/react
 * - Cierre con overlay, X, o ESC
 * 
 * USO:
 * ```tsx
 * <ModalWorldClass
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   titulo="Comunicaciones del Proceso"
 *   codigo="PJ-2025-001"
 *   icono={<MessageSquare />}
 *   badges={[
 *     { label: 'NOTIFICADA', variant: 'primary' },
 *     { label: '5 mensajes', icon: <Clock />, variant: 'info' }
 *   ]}
 * >
 *   {children}
 * </ModalWorldClass>
 * ```
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LucideIcon } from 'lucide-react';

// ============ TIPOS ============

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface ModalBadge {
  label: string;
  icon?: ReactNode;
  variant?: BadgeVariant;
}

export interface ModalWorldClassProps {
  /** Estado de apertura del modal */
  isOpen: boolean;
  
  /** Función para cerrar el modal */
  onClose: () => void;
  
  /** Título principal del modal */
  titulo: string;
  
  /** Código o referencia (aparece bajo el título) */
  codigo?: string;
  
  /** Ícono del header (lucide-react) */
  icono?: ReactNode;
  
  /** Badges en el header */
  badges?: ModalBadge[];
  
  /** Contenido del modal */
  children: ReactNode;
  
  /** Footer personalizado (opcional) */
  footer?: ReactNode;
  
  /** Tamaño del modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /** Permitir cerrar con overlay click */
  closeOnOverlay?: boolean;
  
  /** Mostrar botón de cerrar */
  showCloseButton?: boolean;
  
  /** Clase CSS adicional para el contenedor del modal */
  className?: string;
}

// ============ ESTILOS DE BADGES ============

const badgeStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[#003DA5] text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-orange-600 text-white',
  danger: 'bg-red-600 text-white',
  info: 'bg-blue-100 text-blue-800 border border-blue-200',
  neutral: 'bg-gray-100 text-gray-800 border border-gray-200'
};

// ============ COMPONENTE PRINCIPAL ============

export function ModalWorldClass({
  isOpen,
  onClose,
  titulo,
  codigo,
  icono,
  badges = [],
  children,
  footer,
  size = 'lg',
  closeOnOverlay = true,
  showCloseButton = true,
  className = ''
}: ModalWorldClassProps) {
  
  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Tamaños del modal
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-7xl mx-4'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Overlay con blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnOverlay ? onClose : undefined}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1] // easeOutCubic
            }}
            className={`
              relative w-full ${sizeClasses[size]}
              bg-white rounded-2xl shadow-2xl
              flex flex-col max-h-[90vh]
              ${className}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ============ HEADER ============ */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-start gap-4 flex-1">
                {/* Ícono */}
                {icono && (
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                    {icono}
                  </div>
                )}

                {/* Título y Código */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl text-gray-900 mb-1">
                    {titulo}
                  </h2>
                  {codigo && (
                    <p className="text-sm text-gray-600">
                      {codigo}
                    </p>
                  )}

                  {/* Badges */}
                  {badges.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {badges.map((badge, index) => (
                        <span
                          key={index}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium
                            ${badgeStyles[badge.variant || 'neutral']}
                          `}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón Cerrar */}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* ============ CONTENIDO ============ */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {/* ============ FOOTER ============ */}
            {footer && (
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============ COMPONENTES AUXILIARES ============

/**
 * Chat Timeline - Para mostrar mensajes tipo chat
 */
export interface MensajeChat {
  id: string;
  autor: {
    nombre: string;
    cargo: string;
    iniciales: string;
  };
  contenido: string;
  timestamp: string;
  tipo?: 'enviado' | 'recibido' | 'sistema';
  reacciones?: string[];
}

interface ChatTimelineProps {
  mensajes: MensajeChat[];
  onResponder?: (mensaje: MensajeChat) => void;
  onReaccionar?: (mensaje: MensajeChat) => void;
}

export function ChatTimeline({ mensajes, onResponder, onReaccionar }: ChatTimelineProps) {
  return (
    <div className="space-y-4">
      {mensajes.map((mensaje) => (
        <div key={mensaje.id} className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
              {mensaje.autor.iniciales}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div>
                <span className="text-sm text-gray-900 font-medium">
                  {mensaje.autor.nombre}
                </span>
                <span className="text-sm text-gray-600 ml-2">
                  {mensaje.autor.cargo}
                </span>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {mensaje.timestamp}
              </span>
            </div>

            <div className="text-sm text-gray-700 mb-2">
              {mensaje.contenido}
            </div>

            {/* Acciones */}
            {(onResponder || onReaccionar) && (
              <div className="flex items-center gap-3">
                {onResponder && (
                  <button
                    onClick={() => onResponder(mensaje)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Responder
                  </button>
                )}
                {onReaccionar && (
                  <button
                    onClick={() => onReaccionar(mensaje)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Reaccionar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Footer con input de mensaje - Para modales tipo chat
 */
interface ModalChatFooterProps {
  placeholder?: string;
  onEnviar: (mensaje: string) => void;
  filtros?: Array<{
    label: string;
    active: boolean;
    onClick: () => void;
    icon?: ReactNode;
  }>;
}

export function ModalChatFooter({ 
  placeholder = 'Escribe un mensaje...', 
  onEnviar,
  filtros = []
}: ModalChatFooterProps) {
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mensaje.trim()) {
      onEnviar(mensaje);
      setMensaje('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-3">
      {/* Filtros */}
      {filtros.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filtros.map((filtro, index) => (
            <button
              key={index}
              onClick={filtro.onClick}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filtro.active 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }
              `}
            >
              {filtro.icon}
              {filtro.label}
            </button>
          ))}
        </div>
      )}

      {/* Input de mensaje */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
        />
        
        {/* Botón enviar */}
        <button
          type="submit"
          disabled={!mensaje.trim()}
          className="absolute bottom-3 right-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Enviar
        </button>
      </form>

      {/* Tip */}
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <span>💡</span>
        <span>Usa <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> para enviar y <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Shift + Enter</kbd> para salto de línea</span>
      </p>
    </div>
  );
}

// ============ EXPORT ADICIONALES ============

import { useState } from 'react';

export { badgeStyles };