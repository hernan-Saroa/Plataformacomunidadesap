/**
 * AVATAR SIGL - Sistema Integral de Gestión Legal
 * Avatar con iniciales para representar usuarios
 */

import { useMemo } from 'react';
import { motion } from 'motion/react';
import DESIGN_TOKENS from './tokens';
import { TooltipSIGL } from './TooltipSIGL';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface AvatarSIGLProps {
  name: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  showStatus?: boolean;
  showTooltip?: boolean;
  imageSrc?: string;
  color?: string;
  className?: string;
  onClick?: () => void;
}

export function AvatarSIGL({
  name,
  size = 'md',
  status,
  showStatus = false,
  showTooltip = true,
  imageSrc,
  color,
  className = '',
  onClick,
}: AvatarSIGLProps) {
  // Tamaños de avatar
  const sizeMap = {
    xs: { container: 24, font: 10, status: 6 },
    sm: { container: 32, font: 12, status: 8 },
    md: { container: 40, font: 14, status: 10 },
    lg: { container: 48, font: 16, status: 12 },
    xl: { container: 64, font: 20, status: 14 },
  };

  const dimensions = sizeMap[size];

  // Generar iniciales
  const initials = useMemo(() => {
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }, [name]);

  // Generar color basado en el nombre (si no se proporciona)
  const backgroundColor = useMemo(() => {
    if (color) return color;

    const colors = [
      '#1F4788', // Azul ESAP
      '#2E5C8A', // Azul secundario
      '#28A745', // Verde
      '#FFC107', // Amarillo
      '#DC3545', // Rojo
      '#6F42C1', // Púrpura
      '#17A2B8', // Cyan
      '#FD7E14', // Naranja
      '#20C997', // Teal
      '#E83E8C', // Rosa
    ];

    // Hash simple del nombre
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }, [name, color]);

  // Colores de status
  const statusColors = {
    online: DESIGN_TOKENS.colors.status.green,
    offline: '#95A5A6',
    busy: DESIGN_TOKENS.colors.status.red,
    away: DESIGN_TOKENS.colors.status.yellow,
  };

  const statusColor = status ? statusColors[status] : undefined;

  // Avatar content
  const avatarContent = (
    <motion.div
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`relative inline-flex items-center justify-center ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        width: `${dimensions.container}px`,
        height: `${dimensions.container}px`,
        borderRadius: DESIGN_TOKENS.borderRadius.round,
        background: backgroundColor,
        color: DESIGN_TOKENS.colors.primary.white,
        fontSize: `${dimensions.font}px`,
        fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
        userSelect: 'none',
        flexShrink: 0,
      }}
      onClick={onClick}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={name}
          className="w-full h-full object-cover"
          style={{
            borderRadius: DESIGN_TOKENS.borderRadius.round,
          }}
        />
      ) : (
        <span>{initials}</span>
      )}

      {/* Status Badge */}
      {showStatus && statusColor && (
        <div
          className="absolute"
          style={{
            width: `${dimensions.status}px`,
            height: `${dimensions.status}px`,
            borderRadius: DESIGN_TOKENS.borderRadius.round,
            background: statusColor,
            border: `2px solid ${DESIGN_TOKENS.colors.primary.white}`,
            bottom: 0,
            right: 0,
          }}
        />
      )}
    </motion.div>
  );

  // Wrap con tooltip si está habilitado
  if (showTooltip) {
    return (
      <TooltipSIGL content={name} position="top">
        {avatarContent}
      </TooltipSIGL>
    );
  }

  return avatarContent;
}

// ========================================
// AVATAR GROUP (múltiples avatares)
// ========================================

export interface AvatarGroupProps {
  users: Array<{
    name: string;
    imageSrc?: string;
    color?: string;
  }>;
  size?: AvatarSize;
  max?: number;
  spacing?: number;
  className?: string;
}

export function AvatarGroup({
  users,
  size = 'md',
  max = 3,
  spacing = -8,
  className = '',
}: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = Math.max(0, users.length - max);

  return (
    <div className={`flex items-center ${className}`}>
      {visibleUsers.map((user, index) => (
        <div
          key={`${user.name}-${index}`}
          style={{
            marginLeft: index > 0 ? `${spacing}px` : 0,
            zIndex: visibleUsers.length - index,
          }}
        >
          <AvatarSIGL
            name={user.name}
            imageSrc={user.imageSrc}
            color={user.color}
            size={size}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          style={{
            marginLeft: `${spacing}px`,
            zIndex: 0,
          }}
        >
          <TooltipSIGL
            content={
              <div>
                {users.slice(max).map((user, idx) => (
                  <div key={idx}>{user.name}</div>
                ))}
              </div>
            }
            position="top"
          >
            <AvatarSIGL
              name={`+${remainingCount}`}
              size={size}
              color={DESIGN_TOKENS.colors.neutral.mediumGray}
              showTooltip={false}
            />
          </TooltipSIGL>
        </div>
      )}
    </div>
  );
}
