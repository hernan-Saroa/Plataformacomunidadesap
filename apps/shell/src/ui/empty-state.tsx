/**
 * ============================================
 * EMPTY STATE - ESTADO VACÍO
 * ============================================
 * 
 * Componente para mostrar cuando no hay datos o resultados.
 * 
 * CARACTERÍSTICAS:
 * 1. Icono personalizable
 * 2. Título y descripción
 * 3. Acción opcional (botón)
 * 4. Ilustración opcional
 * 5. Variantes para diferentes contextos
 */

import { LucideIcon } from 'lucide-react';
import { Button } from './button';

// ============ TIPOS ============

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  illustration?: React.ReactNode;
  variant?: 'default' | 'search' | 'error' | 'success';
}

// ============ CONFIGURACIÓN ============

const VARIANT_CONFIG = {
  default: {
    iconColor: 'text-gray-300',
    titleColor: 'text-gray-700',
    descriptionColor: 'text-gray-500'
  },
  search: {
    iconColor: 'text-blue-300',
    titleColor: 'text-blue-700',
    descriptionColor: 'text-blue-500'
  },
  error: {
    iconColor: 'text-red-300',
    titleColor: 'text-red-700',
    descriptionColor: 'text-red-500'
  },
  success: {
    iconColor: 'text-green-300',
    titleColor: 'text-green-700',
    descriptionColor: 'text-green-500'
  }
};

// ============ COMPONENTE PRINCIPAL ============

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration,
  variant = 'default'
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {/* Ilustración o Icono */}
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : Icon ? (
        <Icon className={`w-20 h-20 mb-6 ${config.iconColor}`} />
      ) : null}

      {/* Título */}
      <h3 className={`text-xl font-bold mb-2 ${config.titleColor}`}>
        {title}
      </h3>

      {/* Descripción */}
      {description && (
        <p className={`text-sm mb-6 max-w-md ${config.descriptionColor}`}>
          {description}
        </p>
      )}

      {/* Acción */}
      {action && (
        <Button
          onClick={action.onClick}
          style={{ backgroundColor: '#003DA5' }}
          className="text-white gap-2"
        >
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
