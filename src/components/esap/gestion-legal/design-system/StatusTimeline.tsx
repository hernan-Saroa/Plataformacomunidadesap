/**
 * STATUS TIMELINE SIGL - Sistema Integral de Gestión Legal
 * Timeline vertical de actuaciones y eventos de expedientes
 */

import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  Upload,
  Download,
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  Gavel,
} from 'lucide-react';
import DESIGN_TOKENS from './tokens';
import { AvatarSIGL } from './AvatarSIGL';
import { BadgeSIGL } from './BadgeSIGL';

// ========================================
// TIPOS
// ========================================

export type TimelineEventType = 
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'comment'
  | 'upload'
  | 'download'
  | 'edit'
  | 'delete'
  | 'deadline'
  | 'hearing'
  | 'sentence'
  | 'custom';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: string; // ISO string o formato DD/MM/YYYY HH:MM
  
  // Usuario responsable
  user?: {
    nombre: string;
    imageSrc?: string;
  };
  
  // Estado/Badge
  status?: 'success' | 'warning' | 'error' | 'info';
  statusLabel?: string;
  
  // Contenido adicional
  metadata?: Record<string, any>;
  
  // Custom icon
  customIcon?: ReactNode;
  customColor?: string;
}

export interface StatusTimelineProps {
  events: TimelineEvent[];
  
  // Expandible
  collapsible?: boolean;
  defaultExpanded?: boolean;
  maxVisible?: number; // Mostrar solo X eventos, resto colapsado
  
  // Estilos
  compact?: boolean;
  showConnector?: boolean;
  
  // Callbacks
  onEventClick?: (event: TimelineEvent) => void;
  
  className?: string;
}

export function StatusTimeline({
  events,
  collapsible = false,
  defaultExpanded = true,
  maxVisible = 5,
  compact = false,
  showConnector = true,
  onEventClick,
  className = '',
}: StatusTimelineProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  // Eventos visibles
  const visibleEvents = collapsible && !isExpanded 
    ? events.slice(0, maxVisible) 
    : events;

  const hasMoreEvents = events.length > maxVisible;

  // Obtener icono según tipo
  const getEventIcon = (event: TimelineEvent): ReactNode => {
    if (event.customIcon) {
      return event.customIcon;
    }

    const iconSize = compact ? 16 : 18;

    const iconMap: Record<TimelineEventType, ReactNode> = {
      created: <FileText size={iconSize} />,
      submitted: <Send size={iconSize} />,
      approved: <CheckCircle size={iconSize} />,
      rejected: <AlertCircle size={iconSize} />,
      comment: <MessageSquare size={iconSize} />,
      upload: <Upload size={iconSize} />,
      download: <Download size={iconSize} />,
      edit: <Edit size={iconSize} />,
      delete: <Trash2 size={iconSize} />,
      deadline: <Clock size={iconSize} />,
      hearing: <Calendar size={iconSize} />,
      sentence: <Gavel size={iconSize} />,
      custom: <FileText size={iconSize} />,
    };

    return iconMap[event.type] || <FileText size={iconSize} />;
  };

  // Obtener color según tipo
  const getEventColor = (event: TimelineEvent): string => {
    if (event.customColor) {
      return event.customColor;
    }

    const colorMap: Record<TimelineEventType, string> = {
      created: DESIGN_TOKENS.colors.primary.blue,
      submitted: DESIGN_TOKENS.colors.primary.blue,
      approved: DESIGN_TOKENS.colors.status.green,
      rejected: DESIGN_TOKENS.colors.status.red,
      comment: '#6B7280',
      upload: DESIGN_TOKENS.colors.primary.blue,
      download: DESIGN_TOKENS.colors.primary.blue,
      edit: DESIGN_TOKENS.colors.status.yellow,
      delete: DESIGN_TOKENS.colors.status.red,
      deadline: DESIGN_TOKENS.colors.status.orange,
      hearing: DESIGN_TOKENS.colors.primary.blue,
      sentence: DESIGN_TOKENS.colors.status.green,
      custom: DESIGN_TOKENS.colors.neutral.mediumGray,
    };

    return colorMap[event.type] || DESIGN_TOKENS.colors.neutral.mediumGray;
  };

  // Formatear timestamp
  const formatTimestamp = (timestamp: string): { date: string; time: string } => {
    try {
      const date = new Date(timestamp);
      const dateStr = date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return { date: dateStr, time: timeStr };
    } catch {
      // Si falla, asumir que ya está formateado
      const parts = timestamp.split(' ');
      return { date: parts[0] || timestamp, time: parts[1] || '' };
    }
  };

  return (
    <div className={className}>
      {/* Events */}
      <div className="relative">
        {visibleEvents.map((event, index) => {
          const isLast = index === visibleEvents.length - 1;
          const color = getEventColor(event);
          const { date, time } = formatTimestamp(event.timestamp);

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`relative flex gap-4 ${
                onEventClick ? 'cursor-pointer hover:bg-gray-50' : ''
              }`}
              style={{
                paddingBottom: isLast ? 0 : compact ? '16px' : '24px',
                paddingLeft: '8px',
                paddingRight: '8px',
                paddingTop: index === 0 ? '0' : '0',
                borderRadius: DESIGN_TOKENS.borderRadius.small,
                transition: 'background-color 0.2s',
              }}
              onClick={() => onEventClick?.(event)}
            >
              {/* Timeline Connector */}
              {showConnector && !isLast && (
                <div
                  className="absolute left-[27px]"
                  style={{
                    top: compact ? '40px' : '48px',
                    bottom: 0,
                    width: '2px',
                    background: DESIGN_TOKENS.colors.neutral.lightGray,
                  }}
                />
              )}

              {/* Icon Circle */}
              <div className="relative flex-shrink-0">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: compact ? '32px' : '40px',
                    height: compact ? '32px' : '40px',
                    borderRadius: DESIGN_TOKENS.borderRadius.round,
                    background: `${color}15`,
                    border: `2px solid ${color}`,
                    color: color,
                  }}
                >
                  {getEventIcon(event)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="flex-1">
                    <h4
                      style={{
                        fontSize: compact 
                          ? DESIGN_TOKENS.typography.fontSize.body 
                          : '15px',
                        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                        color: DESIGN_TOKENS.colors.neutral.darkGray,
                        lineHeight: 1.4,
                      }}
                    >
                      {event.title}
                    </h4>
                    {event.description && (
                      <p
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.small,
                          color: DESIGN_TOKENS.colors.neutral.mediumGray,
                          lineHeight: DESIGN_TOKENS.typography.lineHeight.small,
                          marginTop: '4px',
                        }}
                      >
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  {event.status && event.statusLabel && (
                    <BadgeSIGL 
                      variant={event.status === 'success' ? 'success' : 
                               event.status === 'warning' ? 'warning' :
                               event.status === 'error' ? 'danger' : 'info'}
                    >
                      {event.statusLabel}
                    </BadgeSIGL>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 mt-2">
                  {/* User */}
                  {event.user && (
                    <div className="flex items-center gap-2">
                      <AvatarSIGL
                        name={event.user.nombre}
                        imageSrc={event.user.imageSrc}
                        size="xs"
                        showTooltip={false}
                      />
                      <span
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.small,
                          color: DESIGN_TOKENS.colors.neutral.mediumGray,
                        }}
                      >
                        {event.user.nombre}
                      </span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1">
                    <Clock 
                      size={12} 
                      style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }} 
                    />
                    <span
                      style={{
                        fontSize: DESIGN_TOKENS.typography.fontSize.small,
                        color: DESIGN_TOKENS.colors.neutral.mediumGray,
                      }}
                    >
                      {date}
                      {time && (
                        <span style={{ marginLeft: '4px' }}>• {time}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Metadata (opcional) */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div
                    className="mt-2"
                    style={{
                      padding: '8px',
                      background: DESIGN_TOKENS.colors.neutral.veryLightGray,
                      borderRadius: DESIGN_TOKENS.borderRadius.small,
                      fontSize: DESIGN_TOKENS.typography.fontSize.small,
                    }}
                  >
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span
                          style={{
                            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                            color: DESIGN_TOKENS.colors.neutral.darkGray,
                          }}
                        >
                          {key}:
                        </span>
                        <span
                          style={{
                            color: DESIGN_TOKENS.colors.neutral.mediumGray,
                          }}
                        >
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Show More/Less */}
      {collapsible && hasMoreEvents && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '16px',
            background: DESIGN_TOKENS.colors.primary.light,
            border: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
            borderRadius: DESIGN_TOKENS.borderRadius.small,
            color: DESIGN_TOKENS.colors.primary.blue,
            fontSize: DESIGN_TOKENS.typography.fontSize.body,
            fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = DESIGN_TOKENS.colors.primary.blue;
            e.currentTarget.style.color = DESIGN_TOKENS.colors.primary.white;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = DESIGN_TOKENS.colors.primary.light;
            e.currentTarget.style.color = DESIGN_TOKENS.colors.primary.blue;
          }}
        >
          {isExpanded 
            ? 'Mostrar Menos' 
            : `Mostrar ${events.length - maxVisible} Más`}
        </button>
      )}

      {/* Empty State */}
      {events.length === 0 && (
        <div
          className="text-center"
          style={{
            padding: '48px 24px',
            color: DESIGN_TOKENS.colors.neutral.mediumGray,
          }}
        >
          <Clock size={48} style={{ margin: '0 auto 16px' }} />
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.body,
              fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
            }}
          >
            No hay actuaciones registradas
          </p>
          <p
            style={{
              fontSize: DESIGN_TOKENS.typography.fontSize.small,
              marginTop: '8px',
            }}
          >
            Las actuaciones aparecerán aquí conforme se registren en el sistema.
          </p>
        </div>
      )}
    </div>
  );
}

// Import React for useState
import * as React from 'react';
