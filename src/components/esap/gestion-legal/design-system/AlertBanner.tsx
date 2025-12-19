/**
 * ALERT BANNER SIGL - Sistema Integral de Gestión Legal
 * Banner sticky de alertas críticas para el top de la página
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import DESIGN_TOKENS from './tokens';
import { ButtonSIGL } from './Button';

// ========================================
// TIPOS
// ========================================

export type AlertBannerVariant = 'critical' | 'warning' | 'info' | 'success';

export interface AlertBannerProps {
  variant: AlertBannerVariant;
  title: string;
  message: string;
  
  // Contador (ej: "3 expedientes vencen hoy")
  count?: number;
  countLabel?: string;
  
  // Sticky
  sticky?: boolean;
  
  // Acciones
  actionLabel?: string;
  onAction?: () => void;
  
  // Cerrar
  dismissible?: boolean;
  onDismiss?: () => void;
  
  // Persistencia
  persistKey?: string; // Si se provee, guarda dismissal en localStorage
  
  className?: string;
}

export function AlertBanner({
  variant,
  title,
  message,
  count,
  countLabel,
  sticky = true,
  actionLabel,
  onAction,
  dismissible = true,
  onDismiss,
  persistKey,
  className = '',
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Verificar si fue dismissed anteriormente
  useEffect(() => {
    if (persistKey) {
      const dismissed = localStorage.getItem(`alert-banner-${persistKey}`);
      if (dismissed === 'true') {
        setIsVisible(false);
        setIsDismissed(true);
      }
    }
  }, [persistKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    
    // Guardar en localStorage si hay persistKey
    if (persistKey) {
      localStorage.setItem(`alert-banner-${persistKey}`, 'true');
    }
    
    // Callback
    if (onDismiss) {
      onDismiss();
    }
  };

  // Configuración por variante
  const variantConfig = {
    critical: {
      bg: '#FEE2E2',
      border: DESIGN_TOKENS.colors.status.red,
      text: '#991B1B',
      icon: <AlertTriangle size={24} />,
    },
    warning: {
      bg: '#FEF3C7',
      border: DESIGN_TOKENS.colors.status.yellow,
      text: '#92400E',
      icon: <AlertCircle size={24} />,
    },
    info: {
      bg: '#DBEAFE',
      border: DESIGN_TOKENS.colors.primary.blue,
      text: '#1E3A8A',
      icon: <Info size={24} />,
    },
    success: {
      bg: '#D1FAE5',
      border: DESIGN_TOKENS.colors.status.green,
      text: '#065F46',
      icon: <CheckCircle size={24} />,
    },
  };

  const config = variantConfig[variant];

  // Si fue dismissed, no renderizar
  if (isDismissed || !isVisible) {
    return null;
  }

  // Validar que el variant sea válido
  if (!config) {
    console.error(`AlertBanner: Invalid variant "${variant}". Valid variants are: critical, warning, info, success`);
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`${sticky ? 'sticky top-0' : ''} ${className}`}
          style={{
            background: config.bg,
            borderBottom: `3px solid ${config.border}`,
            padding: '16px 24px',
            zIndex: DESIGN_TOKENS.zIndex.sticky,
            boxShadow: sticky ? DESIGN_TOKENS.shadows.level2 : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto flex items-start gap-4">
            {/* Icon */}
            <div
              className="flex-shrink-0"
              style={{ color: config.border }}
            >
              {config.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                      color: config.text,
                      marginBottom: '4px',
                    }}
                  >
                    {title}
                    {count !== undefined && (
                      <span
                        style={{
                          marginLeft: '8px',
                          padding: '2px 8px',
                          background: config.border,
                          color: DESIGN_TOKENS.colors.primary.white,
                          borderRadius: DESIGN_TOKENS.borderRadius.small,
                          fontSize: DESIGN_TOKENS.typography.fontSize.small,
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </h3>
                  <p
                    style={{
                      fontSize: DESIGN_TOKENS.typography.fontSize.body,
                      color: config.text,
                      lineHeight: DESIGN_TOKENS.typography.lineHeight.body,
                    }}
                  >
                    {message}
                    {count !== undefined && countLabel && (
                      <span
                        style={{
                          fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
                          marginLeft: '4px',
                        }}
                      >
                        {countLabel}
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {actionLabel && onAction && (
                    <ButtonSIGL
                      variant={variant === 'critical' ? 'danger' : 'primary'}
                      size="small"
                      icon={<ExternalLink size={14} />}
                      iconPosition="right"
                      onClick={onAction}
                    >
                      {actionLabel}
                    </ButtonSIGL>
                  )}

                  {dismissible && (
                    <button
                      onClick={handleDismiss}
                      className="hover:opacity-70 transition-opacity"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: config.text,
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
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ========================================
// ALERT BANNER STACK (múltiples alerts)
// ========================================

export interface AlertBannerStackProps {
  alerts: Array<AlertBannerProps & { id: string }>;
  onDismissAlert?: (id: string) => void;
  className?: string;
}

export function AlertBannerStack({
  alerts,
  onDismissAlert,
  className = '',
}: AlertBannerStackProps) {
  const [visibleAlerts, setVisibleAlerts] = useState(alerts);

  useEffect(() => {
    setVisibleAlerts(alerts);
  }, [alerts]);

  const handleDismiss = (id: string) => {
    setVisibleAlerts((prev) => prev.filter((alert) => alert.id !== id));
    if (onDismissAlert) {
      onDismissAlert(id);
    }
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {visibleAlerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          {...alert}
          sticky={false}
          onDismiss={() => handleDismiss(alert.id)}
        />
      ))}
    </div>
  );
}

// ========================================
// HELPER: Crear alertas comunes
// ========================================

export const createExpedienteAlert = {
  vencimientosHoy: (count: number, onAction: () => void): AlertBannerProps => ({
    variant: 'critical',
    title: '¡Atención Urgente!',
    message: 'expediente(s) vencen HOY. Requieren acción inmediata.',
    count,
    countLabel: '',
    actionLabel: 'Ver Expedientes',
    onAction,
    persistKey: `vencimientos-hoy-${new Date().toISOString().split('T')[0]}`,
  }),

  vencimientosSemana: (count: number, onAction: () => void): AlertBannerProps => ({
    variant: 'warning',
    title: 'Plazos Próximos a Vencer',
    message: 'expediente(s) vencen esta semana. Planifique su trabajo.',
    count,
    countLabel: '',
    actionLabel: 'Ver Detalles',
    onAction,
    persistKey: `vencimientos-semana-${new Date().toISOString().split('T')[0]}`,
  }),

  expedientesVencidos: (count: number, onAction: () => void): AlertBannerProps => ({
    variant: 'critical',
    title: '¡Expedientes Vencidos!',
    message: 'expediente(s) están vencidos. Tome acción correctiva inmediata.',
    count,
    countLabel: '',
    actionLabel: 'Revisar Ahora',
    onAction,
  }),

  actualizacionSistema: (message: string): AlertBannerProps => ({
    variant: 'info',
    title: 'Actualización del Sistema',
    message,
    dismissible: true,
    persistKey: `update-${Date.now()}`,
  }),

  mantenimientoProgramado: (fecha: string, hora: string): AlertBannerProps => ({
    variant: 'warning',
    title: 'Mantenimiento Programado',
    message: `El sistema no estará disponible el ${fecha} de ${hora}. Planifique su trabajo en consecuencia.`,
    dismissible: true,
    persistKey: `maintenance-${fecha}`,
  }),
};