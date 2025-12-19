/**
 * CHAT BUBBLE SIGL - Sistema Integral de Gestión Legal
 * Burbujas de chat para comunicación interna entre usuarios
 */

import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Check, CheckCheck, Clock, File, Download } from 'lucide-react';
import DESIGN_TOKENS from './tokens';
import { AvatarSIGL } from './AvatarSIGL';
import { TooltipSIGL } from './TooltipSIGL';

// ========================================
// TIPOS
// ========================================

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface ChatBubbleProps {
  // Contenido
  message: string;
  timestamp: string; // ISO string o formato HH:MM
  
  // Usuario
  user: {
    nombre: string;
    imageSrc?: string;
  };
  
  // Tipo de mensaje
  isOwn?: boolean; // true = mensaje propio (derecha), false = mensaje de otro (izquierda)
  
  // Estado (solo para mensajes propios)
  status?: MessageStatus;
  
  // Adjuntos
  attachments?: MessageAttachment[];
  
  // Metadatos
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showStatus?: boolean;
  
  // Callbacks
  onDownloadAttachment?: (attachment: MessageAttachment) => void;
  
  className?: string;
}

export function ChatBubble({
  message,
  timestamp,
  user,
  isOwn = false,
  status = 'sent',
  attachments = [],
  showAvatar = true,
  showTimestamp = true,
  showStatus = true,
  onDownloadAttachment,
  className = '',
}: ChatBubbleProps) {
  // Formatear timestamp
  const formatTimestamp = (ts: string): string => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  // Render markdown simple (bold, italic)
  const renderMessage = (text: string): ReactNode => {
    // **bold**
    let rendered = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // *italic*
    rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // _italic_
    rendered = rendered.replace(/_(.*?)_/g, '<em>$1</em>');
    
    return <span dangerouslySetInnerHTML={{ __html: rendered }} />;
  };

  // Status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock size={14} />;
      case 'sent':
        return <Check size={14} />;
      case 'delivered':
        return <CheckCheck size={14} />;
      case 'read':
        return <CheckCheck size={14} style={{ color: DESIGN_TOKENS.colors.primary.blue }} />;
      default:
        return null;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${className}`}
      style={{
        marginBottom: '12px',
      }}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0">
          <AvatarSIGL
            name={user.nombre}
            imageSrc={user.imageSrc}
            size="sm"
            showTooltip={!isOwn}
          />
        </div>
      )}

      {/* Bubble Container */}
      <div
        className="flex flex-col"
        style={{
          maxWidth: '70%',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
        }}
      >
        {/* User Name (solo si no es propio) */}
        {!isOwn && (
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              color: DESIGN_TOKENS.colors.neutral.mediumGray,
              marginBottom: '4px',
              paddingLeft: '12px',
            }}
          >
            {user.nombre}
          </p>
        )}

        {/* Bubble */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: DESIGN_TOKENS.borderRadius.medium,
            background: isOwn 
              ? DESIGN_TOKENS.colors.primary.blue 
              : DESIGN_TOKENS.colors.neutral.veryLightGray,
            color: isOwn 
              ? DESIGN_TOKENS.colors.primary.white 
              : DESIGN_TOKENS.colors.neutral.darkGray,
            fontSize: DESIGN_TOKENS.typography.fontSize.body,
            lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
            wordBreak: 'break-word',
            boxShadow: DESIGN_TOKENS.shadows.level1,
          }}
        >
          {/* Message Text */}
          <div>{renderMessage(message)}</div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  onClick={() => onDownloadAttachment?.(attachment)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: isOwn 
                      ? 'rgba(255, 255, 255, 0.15)' 
                      : 'rgba(0, 0, 0, 0.05)',
                    borderRadius: DESIGN_TOKENS.borderRadius.small,
                    cursor: onDownloadAttachment ? 'pointer' : 'default',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (onDownloadAttachment) {
                      e.currentTarget.style.background = isOwn 
                        ? 'rgba(255, 255, 255, 0.25)' 
                        : 'rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isOwn 
                      ? 'rgba(255, 255, 255, 0.15)' 
                      : 'rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <File size={16} />
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.small,
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {attachment.name}
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        opacity: 0.8,
                      }}
                    >
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                  {onDownloadAttachment && <Download size={14} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer (Timestamp + Status) */}
        {(showTimestamp || (showStatus && isOwn)) && (
          <div
            className="flex items-center gap-1 mt-1"
            style={{
              paddingLeft: isOwn ? 0 : '12px',
              paddingRight: isOwn ? '12px' : 0,
            }}
          >
            {showTimestamp && (
              <span
                style={{
                  fontSize: '11px',
                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                }}
              >
                {formatTimestamp(timestamp)}
              </span>
            )}

            {showStatus && isOwn && (
              <TooltipSIGL
                content={
                  status === 'sending' ? 'Enviando...' :
                  status === 'sent' ? 'Enviado' :
                  status === 'delivered' ? 'Entregado' :
                  'Leído'
                }
                position="top"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: status === 'read' 
                      ? DESIGN_TOKENS.colors.primary.blue 
                      : DESIGN_TOKENS.colors.neutral.mediumGray,
                  }}
                >
                  {getStatusIcon()}
                </div>
              </TooltipSIGL>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ========================================
// CHAT CONTAINER (Wrapper para múltiples mensajes)
// ========================================

export interface ChatMessage extends Omit<ChatBubbleProps, 'isOwn'> {
  id: string;
  userId: string;
}

export interface ChatContainerProps {
  messages: ChatMessage[];
  currentUserId: string;
  
  // Agrupación
  groupByDate?: boolean;
  
  // Callbacks
  onDownloadAttachment?: (attachment: MessageAttachment) => void;
  
  className?: string;
}

export function ChatContainer({
  messages,
  currentUserId,
  groupByDate = true,
  onDownloadAttachment,
  className = '',
}: ChatContainerProps) {
  // Agrupar por fecha
  const groupedMessages = React.useMemo(() => {
    if (!groupByDate) {
      return { today: messages };
    }

    const groups: Record<string, ChatMessage[]> = {};
    
    messages.forEach((message) => {
      try {
        const date = new Date(message.timestamp);
        const dateKey = date.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
        
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(message);
      } catch {
        if (!groups['today']) {
          groups['today'] = [];
        }
        groups['today'].push(message);
      }
    });

    return groups;
  }, [messages, groupByDate]);

  return (
    <div className={className}>
      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <div key={date}>
          {/* Date Divider */}
          {groupByDate && (
            <div
              className="flex items-center justify-center my-4"
            >
              <div
                style={{
                  padding: '4px 12px',
                  background: DESIGN_TOKENS.colors.neutral.veryLightGray,
                  borderRadius: DESIGN_TOKENS.borderRadius.round,
                  fontSize: DESIGN_TOKENS.typography.fontSize.small,
                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                }}
              >
                {date}
              </div>
            </div>
          )}

          {/* Messages */}
          {msgs.map((message, index) => {
            const isOwn = message.userId === currentUserId;
            const prevMessage = index > 0 ? msgs[index - 1] : null;
            const showAvatar = !prevMessage || prevMessage.userId !== message.userId;

            return (
              <ChatBubble
                key={message.id}
                {...message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                onDownloadAttachment={onDownloadAttachment}
              />
            );
          })}
        </div>
      ))}

      {/* Empty State */}
      {messages.length === 0 && (
        <div
          className="text-center"
          style={{
            padding: '48px 24px',
            color: DESIGN_TOKENS.colors.neutral.mediumGray,
          }}
        >
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.body,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            }}
          >
            No hay mensajes
          </p>
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              marginTop: '8px',
            }}
          >
            Los mensajes aparecerán aquí cuando se envíen
          </p>
        </div>
      )}
    </div>
  );
}

// Import React for useMemo
import * as React from 'react';
