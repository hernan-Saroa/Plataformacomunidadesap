/**
 * ============================================
 * MODAL WORLD CLASS - COMPONENTE BASE
 * ============================================
 * 
 * Componente modal reutilizable con diseño ESAP
 * Incluye soporte para:
 * - Chat timeline
 * - Footer personalizado
 * - Badges y etiquetas
 * - Animaciones
 * 
 * ÚLTIMA ACTUALIZACIÓN: 30 Enero 2025
 */

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ============================================
// TIPOS
// ============================================

export interface MensajeChat {
  id: string;
  autor: string;
  rol: string;
  mensaje: string;
  timestamp: Date;
  tipo?: 'ENVIADO' | 'RECIBIDO' | 'SISTEMA';
  estado?: 'PENDIENTE' | 'ENVIADO' | 'LEIDO';
  reacciones?: Array<{
    emoji: string;
    count: number;
    usuarios: string[];
  }>;
}

export interface ModalWorldClassProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  codigo?: string;
  icono?: ReactNode;
  badges?: Array<{
    texto: string;
    color: string;
  }>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlay?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

export interface ChatTimelineProps {
  mensajes: MensajeChat[];
  usuarioActual?: string;
  onReaccionar?: (mensajeId: string, emoji: string) => void;
}

export interface ModalChatFooterProps {
  placeholder?: string;
  onEnviar: (mensaje: string) => void;
  disabled?: boolean;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModalWorldClass({
  isOpen,
  onClose,
  titulo,
  codigo,
  icono,
  badges,
  size = 'lg',
  closeOnOverlay = true,
  footer,
  children
}: ModalWorldClassProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]'
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto flex items-center justify-center p-6"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh] my-8`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex items-start gap-4 flex-1">
                {/* Icono */}
                {icono && (
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0">
                    {icono}
                  </div>
                )}

                {/* Título y badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">{titulo}</h2>
                    {codigo && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono">
                        {codigo}
                      </span>
                    )}
                  </div>

                  {/* Badges */}
                  {badges && badges.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {badges.map((badge, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium rounded-full text-white"
                          style={{ backgroundColor: badge.color }}
                        >
                          {badge.texto}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón cerrar */}
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-4"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-gray-200 p-6 bg-gray-50" style={{ borderRadius: "0px 0px 15px 15px" }}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// COMPONENTE: CHAT TIMELINE
// ============================================

export function ChatTimeline({
  mensajes,
  usuarioActual,
  onReaccionar
}: ChatTimelineProps) {
  return (
    <div className="space-y-4">
      {mensajes.map((mensaje) => {
        const esPropio = mensaje.autor === usuarioActual;
        const esProcesoAuditado = mensaje.rol === 'PROCESO_AUDITADO';

        return (
          <div
            key={mensaje.id}
            className={`flex ${esPropio ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                esPropio
                  ? 'bg-blue-600 text-white'
                  : esProcesoAuditado
                  ? 'bg-orange-50 text-gray-900 border border-orange-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {/* Header del mensaje */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-medium ${
                    esPropio ? 'text-blue-100' : 'text-gray-600'
                  }`}
                >
                  {mensaje.autor}
                </span>
                <span
                  className={`text-xs ${
                    esPropio ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  {new Date(mensaje.timestamp).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {/* Contenido */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {mensaje.mensaje}
              </p>

              {/* Reacciones */}
              {mensaje.reacciones && mensaje.reacciones.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200/20">
                  {mensaje.reacciones.map((reaccion, index) => (
                    <button
                      key={index}
                      onClick={() => onReaccionar?.(mensaje.id, reaccion.emoji)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        esPropio
                          ? 'bg-blue-500 hover:bg-blue-400'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span>{reaccion.emoji}</span>
                      <span className={esPropio ? 'text-white' : 'text-gray-700'}>
                        {reaccion.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Estado */}
              {mensaje.estado && esPropio && (
                <div className="mt-2 text-xs text-blue-200">
                  {mensaje.estado === 'LEIDO' && '✓✓ Leído'}
                  {mensaje.estado === 'ENVIADO' && '✓ Enviado'}
                  {mensaje.estado === 'PENDIENTE' && '○ Enviando...'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// COMPONENTE: MODAL CHAT FOOTER
// ============================================

export function ModalChatFooter({
  placeholder = 'Escribe un mensaje...',
  onEnviar,
  disabled = false
}: ModalChatFooterProps) {
  const [mensaje, setMensaje] = React.useState('');

  const handleEnviar = () => {
    if (mensaje.trim() && !disabled) {
      onEnviar(mensaje);
      setMensaje('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  return (
    <div className="flex items-end gap-3">
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleEnviar}
        disabled={disabled || !mensaje.trim()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Enviar
      </button>
    </div>
  );
}

// Importar React para useState
import * as React from 'react';

export default ModalWorldClass;