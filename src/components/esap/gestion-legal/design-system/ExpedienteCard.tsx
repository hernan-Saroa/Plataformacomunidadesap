/**
 * EXPEDIENTE CARD SIGL - Sistema Integral de Gestión Legal
 * Card especializada para mostrar información de expedientes judiciales
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Calendar, 
  User, 
  MapPin, 
  ChevronDown,
  Edit,
  Trash2,
  Eye,
  Clock,
  AlertCircle,
} from 'lucide-react';
import DESIGN_TOKENS from './tokens';
import { CardSIGL } from './CardSIGL';
import { BadgeSIGL, PlazoBadge } from './BadgeSIGL';
import { AvatarSIGL } from './AvatarSIGL';
import { IconButtonSIGL } from './Button';
import { TooltipSIGL } from './TooltipSIGL';

// ========================================
// TIPOS
// ========================================

export interface Actuacion {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  responsable?: string;
}

export interface ExpedienteCardProps {
  // Datos básicos
  numero: string;
  demandante: string;
  demandado: string;
  juzgado: string;
  
  // Estado y plazo
  estado: 'recibida' | 'enDefensa' | 'respondida' | 'vencida' | 'sentenciada';
  diasRestantes: number;
  vencido?: boolean;
  fechaNotificacion: string;
  fechaVencimiento?: string;
  
  // Asignación
  abogado?: {
    nombre: string;
    imageSrc?: string;
    status?: 'online' | 'offline' | 'busy' | 'away';
  };
  
  // Actuaciones (opcional)
  actuaciones?: Actuacion[];
  showActuaciones?: boolean;
  
  // Acciones
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  
  // Estilos
  hoverable?: boolean;
  compact?: boolean;
  className?: string;
}

export function ExpedienteCard({
  numero,
  demandante,
  demandado,
  juzgado,
  estado,
  diasRestantes,
  vencido = false,
  fechaNotificacion,
  fechaVencimiento,
  abogado,
  actuaciones = [],
  showActuaciones = false,
  onView,
  onEdit,
  onDelete,
  onClick,
  hoverable = true,
  compact = false,
  className = '',
}: ExpedienteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <motion.div
      whileHover={hoverable ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={handleCardClick}
      className={`rounded-lg overflow-hidden ${
        onClick || hoverable ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        background: DESIGN_TOKENS.colors.primary.white,
        border: `1px solid ${DESIGN_TOKENS.colors.primary.light}`,
        borderRadius: DESIGN_TOKENS.borderRadius.medium,
        boxShadow: DESIGN_TOKENS.shadows.level1,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: compact ? '12px 16px' : '16px 20px',
          background: DESIGN_TOKENS.colors.primary.light,
          borderBottom: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
        }}
      >
        <div className="flex items-center gap-3">
          <FileText 
            size={20} 
            style={{ color: DESIGN_TOKENS.colors.primary.blue }} 
          />
          <div>
            <TooltipSIGL content="Copiar número de expediente">
              <h3
                style={{
                  fontSize: compact ? '14px' : '16px',
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: DESIGN_TOKENS.colors.primary.blue,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                {numero}
              </h3>
            </TooltipSIGL>
            <p
              style={{
                fontSize: DESIGN_TOKENS.typography.fontSize.small,
                color: DESIGN_TOKENS.colors.neutral.mediumGray,
              }}
            >
              Notificado: {fechaNotificacion}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BadgeSIGL variant={estado}>
            {estado.replace(/([A-Z])/g, ' $1').toUpperCase()}
          </BadgeSIGL>
          <PlazoBadge 
            diasRestantes={diasRestantes} 
            vencido={vencido}
            showIcon 
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: compact ? '12px 16px' : '16px 20px',
        }}
      >
        {/* Partes */}
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2">
            <User 
              size={16} 
              className="flex-shrink-0 mt-0.5"
              style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }} 
            />
            <div>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.small,
                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                }}
              >
                Demandante:
              </p>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.body,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral.darkGray,
                }}
              >
                {demandante}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User 
              size={16} 
              className="flex-shrink-0 mt-0.5"
              style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }} 
            />
            <div>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.small,
                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                }}
              >
                Demandado:
              </p>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.body,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                  color: DESIGN_TOKENS.colors.neutral.darkGray,
                }}
              >
                {demandado}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin 
              size={16} 
              className="flex-shrink-0 mt-0.5"
              style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }} 
            />
            <div>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.small,
                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                }}
              >
                Juzgado:
              </p>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.body,
                  color: DESIGN_TOKENS.colors.neutral.darkGray,
                }}
              >
                {juzgado}
              </p>
            </div>
          </div>
        </div>

        {/* Plazo y Abogado */}
        <div
          className="flex items-center justify-between pt-3"
          style={{
            borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
          }}
        >
          {/* Información de plazo */}
          <div className="flex items-center gap-2">
            {(vencido || diasRestantes < 5) && (
              <TooltipSIGL 
                content={vencido ? "Expediente vencido" : "Plazo crítico - menos de 5 días"}
              >
                <AlertCircle 
                  size={18} 
                  style={{ 
                    color: vencido 
                      ? DESIGN_TOKENS.colors.status.red 
                      : DESIGN_TOKENS.colors.status.orange 
                  }} 
                />
              </TooltipSIGL>
            )}
            <div>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.small,
                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                }}
              >
                {vencido ? 'Vencido hace' : 'Vence en'}
              </p>
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.body,
                  fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                  color: vencido 
                    ? DESIGN_TOKENS.colors.status.red 
                    : diasRestantes < 5 
                    ? DESIGN_TOKENS.colors.status.orange 
                    : DESIGN_TOKENS.colors.status.green,
                }}
              >
                {Math.abs(diasRestantes)} día{Math.abs(diasRestantes) !== 1 ? 's' : ''}
                {fechaVencimiento && (
                  <span
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.small,
                      color: DESIGN_TOKENS.colors.neutral.mediumGray,
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.regular,
                      marginLeft: '4px',
                    }}
                  >
                    ({fechaVencimiento})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Abogado asignado */}
          {abogado && (
            <div className="flex items-center gap-2">
              <p
                style={{
                  fontSize: DESIGN_TOKENS.typography.fontSize.small,
                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                }}
              >
                Asignado a:
              </p>
              <AvatarSIGL
                name={abogado.nombre}
                imageSrc={abogado.imageSrc}
                size="sm"
                status={abogado.status}
                showStatus={!!abogado.status}
              />
            </div>
          )}
        </div>

        {/* Actuaciones (colapsable) */}
        {showActuaciones && actuaciones.length > 0 && (
          <div
            className="mt-3 pt-3"
            style={{
              borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-full flex items-center justify-between"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 0',
              }}
            >
              <div className="flex items-center gap-2">
                <Clock 
                  size={16} 
                  style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }} 
                />
                <span
                  style={{
                    fontSize: DESIGN_TOKENS.typography.fontSize.body,
                    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                    color: DESIGN_TOKENS.colors.neutral.darkGray,
                  }}
                >
                  Actuaciones ({actuaciones.length})
                </span>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown 
                  size={18} 
                  style={{ color: DESIGN_TOKENS.colors.neutral.mediumGray }} 
                />
              </motion.div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="space-y-2 mt-2">
                    {actuaciones.slice(0, 3).map((actuacion) => (
                      <div
                        key={actuacion.id}
                        style={{
                          padding: '8px',
                          background: DESIGN_TOKENS.colors.neutral.veryLightGray,
                          borderRadius: DESIGN_TOKENS.borderRadius.small,
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p
                              style={{
                                fontSize: DESIGN_TOKENS.typography.fontSize.small,
                                fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                                color: DESIGN_TOKENS.colors.neutral.darkGray,
                              }}
                            >
                              {actuacion.tipo}
                            </p>
                            <p
                              style={{
                                fontSize: DESIGN_TOKENS.typography.fontSize.small,
                                color: DESIGN_TOKENS.colors.neutral.mediumGray,
                              }}
                            >
                              {actuacion.descripcion}
                            </p>
                            {actuacion.responsable && (
                              <p
                                style={{
                                  fontSize: DESIGN_TOKENS.typography.fontSize.small,
                                  color: DESIGN_TOKENS.colors.neutral.mediumGray,
                                  fontStyle: 'italic',
                                }}
                              >
                                Por: {actuacion.responsable}
                              </p>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: DESIGN_TOKENS.typography.fontSize.small,
                              color: DESIGN_TOKENS.colors.neutral.mediumGray,
                              whiteSpace: 'nowrap',
                              marginLeft: '8px',
                            }}
                          >
                            {actuacion.fecha}
                          </span>
                        </div>
                      </div>
                    ))}
                    {actuaciones.length > 3 && (
                      <p
                        style={{
                          fontSize: DESIGN_TOKENS.typography.fontSize.small,
                          color: DESIGN_TOKENS.colors.primary.blue,
                          textAlign: 'center',
                          padding: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Ver todas ({actuaciones.length})
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer - Acciones */}
      {(onView || onEdit || onDelete) && (
        <div
          className="flex items-center justify-end gap-2"
          style={{
            padding: compact ? '8px 16px' : '12px 20px',
            background: DESIGN_TOKENS.colors.neutral.veryLightGray,
            borderTop: `1px solid ${DESIGN_TOKENS.colors.neutral.lightGray}`,
          }}
        >
          {onView && (
            <TooltipSIGL content="Ver detalles">
              <IconButtonSIGL
                icon={<Eye size={16} />}
                variant="default"
                onClick={(e) => handleActionClick(e, onView)}
              />
            </TooltipSIGL>
          )}
          {onEdit && (
            <TooltipSIGL content="Editar expediente">
              <IconButtonSIGL
                icon={<Edit size={16} />}
                variant="primary"
                onClick={(e) => handleActionClick(e, onEdit)}
              />
            </TooltipSIGL>
          )}
          {onDelete && (
            <TooltipSIGL content="Eliminar expediente">
              <IconButtonSIGL
                icon={<Trash2 size={16} />}
                variant="danger"
                onClick={(e) => handleActionClick(e, onDelete)}
              />
            </TooltipSIGL>
          )}
        </div>
      )}
    </motion.div>
  );
}
