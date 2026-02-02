/**
 * ═══════════════════════════════════════════════════════════════
 * RESPONSIVE HEADER - DÍA 5
 * ═══════════════════════════════════════════════════════════════
 * 
 * Componente de Header adaptativo para todos los módulos ESAP.
 * 
 * CARACTERÍSTICAS:
 * ✅ Adaptativo mobile/tablet/desktop/4K
 * ✅ Soporte para iconos y badges
 * ✅ Acciones primarias y secundarias
 * ✅ Breadcrumbs opcionales
 * ✅ Motion animations
 * ✅ Tipografía responsive escalable
 * 
 * BREAKPOINTS:
 * - Mobile:  < 768px  - Layout vertical, texto compacto
 * - Tablet:  768-1024px - Layout híbrido
 * - Desktop: 1024-1920px - Layout horizontal estándar
 * - 4K:      > 1920px - Layout expandido, texto grande
 */

import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { Badge } from './badge';

interface ResponsiveHeaderAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

interface ResponsiveHeaderProps {
  /** Título principal del módulo */
  title: string;
  
  /** Descripción o subtítulo */
  description?: string;
  
  /** Ícono del módulo (opcional) */
  icon?: LucideIcon;
  
  /** Badge de estado o contador (opcional) */
  badge?: {
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
  };
  
  /** Acción principal (botón CTA) */
  primaryAction?: ResponsiveHeaderAction;
  
  /** Acciones secundarias (botones adicionales) */
  secondaryActions?: ResponsiveHeaderAction[];
  
  /** Breadcrumbs de navegación (opcional) */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  
  /** Clase adicional para el contenedor */
  className?: string;
}

export function ResponsiveHeader({
  title,
  description,
  icon: Icon,
  badge,
  primaryAction,
  secondaryActions = [],
  breadcrumbs,
  className = ''
}: ResponsiveHeaderProps) {
  
  const getBadgeClassName = (variant?: string) => {
    const variants = {
      success: 'bg-green-100 text-green-700 border-green-300',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      danger: 'bg-red-100 text-red-700 border-red-300',
      default: 'bg-blue-100 text-blue-700 border-blue-300'
    };
    return variants[variant as keyof typeof variants] || variants.default;
  };

  const getActionClassName = (variant?: string, customClass?: string) => {
    const baseClasses = 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all';
    
    const variants = {
      primary: 'bg-gradient-to-r from-[#003DA5] to-[#0052cc] text-white hover:shadow-lg hover:-translate-y-0.5',
      secondary: 'bg-white text-[#003DA5] border-2 border-[#003DA5] hover:bg-[#003DA5] hover:text-white',
      ghost: 'text-[#003DA5] hover:bg-[#003DA5]/10'
    };
    
    const variantClass = variants[variant as keyof typeof variants] || variants.ghost;
    return `${baseClasses} ${variantClass} ${customClass || ''}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${className}`}
    >
      {/* Left Section: Title, Description, Icon, Badge */}
      <div className="flex-1">
        {/* Breadcrumbs (opcional) */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 mb-2 text-xs lg:text-[11px] xl:text-xs text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-[#003DA5] transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-700 font-medium">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="text-gray-400">/</span>
                )}
              </div>
            ))}
          </nav>
        )}

        {/* Title Section */}
        <div className="flex items-start gap-3">
          {/* Icon (opcional) */}
          {Icon && (
            <div 
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
              }}
            >
              <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
          )}

          {/* Title + Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-extrabold text-[--esap-gray-900] tracking-tight">
                {title}
              </h1>
              
              {/* Badge (opcional) */}
              {badge && (
                <Badge className={`${getBadgeClassName(badge.variant)} border text-xs lg:text-sm`}>
                  {badge.label}
                </Badge>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="text-xs lg:text-sm xl:text-base text-[--esap-gray-600] mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Section: Actions */}
      {(primaryAction || secondaryActions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          {/* Secondary Actions */}
          {secondaryActions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={getActionClassName(action.variant || 'ghost', action.className)}
              >
                <ActionIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="text-sm lg:text-base hidden sm:inline">{action.label}</span>
              </button>
            );
          })}

          {/* Primary Action (CTA) */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className={getActionClassName(primaryAction.variant || 'primary', primaryAction.className)}
            >
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4 lg:w-5 lg:h-5" />}
              <span className="text-sm lg:text-base">{primaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
