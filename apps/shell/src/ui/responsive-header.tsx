/**
 * ═══════════════════════════════════════════════════════════════
 * RESPONSIVE HEADER - VERSIÓN CORREGIDA V3 (ULTRA-AGRESIVA)
 * ═══════════════════════════════════════════════════════════════
 * 
 * 🚨 SOLUCIÓN AGRESIVA: SIDEBAR DESPLEGADO OCULTA BOTONES
 * 
 * ESTRATEGIA ULTRA-RESPONSIVE:
 * ✅ Breakpoints más agresivos (800px → 1200px)
 * ✅ Menú "Más opciones" (tres puntos) en lugar de todos los botones
 * ✅ Solo botón primario siempre visible + menú desplegable
 * ✅ Descripción se oculta en modo compacto
 * ✅ TODAS las funcionalidades SIEMPRE accesibles
 * 
 * NUEVOS BREAKPOINTS:
 * - < 800px:   Solo botón primario + menú "⋮"
 * - 800-1200px: Botón primario completo + iconos secundarios
 * - > 1200px:  Todos los botones completos
 */

import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon, MoreVertical } from 'lucide-react';
import { Badge } from './badge';
import { useState, useEffect, useRef } from 'react';

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
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // 🚀 DETECTAR ANCHO REAL DEL CONTENEDOR (no del viewport)
  useEffect(() => {
    const updateWidth = () => {
      if (headerRef.current) {
        const width = headerRef.current.offsetWidth;
        setContainerWidth(width);

      }
    };
    
    updateWidth();
    
    const resizeObserver = new ResizeObserver(updateWidth);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }
    
    window.addEventListener('resize', updateWidth);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);
  
  // 🎯 LÓGICA DE RENDERIZADO ULTRA-AGRESIVA
  // Breakpoints ajustados para máxima compatibilidad con sidebar desplegado
  // LAPTOP 1366px + SIDEBAR DESPLEGADO (280px) = 1086px disponibles
  const shouldShowMinimal = containerWidth < 1100;       // < 1100px: Solo primario + menú
  const shouldShowCompact = containerWidth >= 1100 && containerWidth < 1300; // Iconos
  const shouldShowFull = containerWidth >= 1300;         // Completo
  

  
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
    const baseClasses = 'inline-flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl font-semibold transition-all text-sm whitespace-nowrap';
    
    const variants = {
      primary: 'bg-gradient-to-r from-[#003DA5] to-[#0052cc] text-white hover:shadow-lg hover:-translate-y-0.5',
      secondary: 'bg-white text-[#003DA5] border-2 border-[#003DA5] hover:bg-[#003DA5] hover:text-white',
      ghost: 'text-[#003DA5] hover:bg-[#003DA5]/10 border border-gray-300'
    };
    
    const variantClass = variants[variant as keyof typeof variants] || variants.ghost;
    return `${baseClasses} ${variantClass} ${customClass || ''}`;
  };

  const getActionKey = (scope: string, action: ResponsiveHeaderAction, index: number) =>
    `${scope}-${action.label}-${index}`;

  const allActions = [
    ...(primaryAction ? [{ ...primaryAction, isPrimary: true }] : []),
    ...secondaryActions.map(action => ({ ...action, isPrimary: false }))
  ];

  return (
    <motion.div
      ref={headerRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4">
        {/* Left Section: Title, Description, Icon, Badge */}
        <div key="header-left" className="flex-1 min-w-0">
        {/* Breadcrumbs (opcional) */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 mb-2 text-xs text-gray-500">
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
        <div className="flex items-start gap-2 md:gap-3">
          {/* Icon (opcional) */}
          {Icon && (
            <div 
              className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
              }}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
          )}

          {/* Title + Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl lg:text-2xl font-extrabold text-[--esap-gray-900] tracking-tight">
                {title}
              </h1>
              
              {/* Badge (opcional) */}
              {badge && (
                <Badge className={`${getBadgeClassName(badge.variant)} border text-[10px] md:text-xs`}>
                  {badge.label}
                </Badge>
              )}
            </div>

            {/* Description - Ocultar en modo compacto */}
            {description && !shouldShowMinimal && (
              <p className="text-[11px] md:text-xs text-[--esap-gray-600] mt-0.5 md:mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        </div>

        {/* Right Section: Actions - RENDERIZADO ULTRA-AGRESIVO */}
        {allActions.length > 0 && (
          <div key="header-actions" className="flex items-center">
          {/* 🚀 MODO COMPLETO: Todos los botones (> 1200px) */}
          {shouldShowFull && (
            <div key="actions-full" className="flex flex-wrap items-center gap-2">
              {/* Secondary Actions */}
              {secondaryActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={getActionKey('full', action, index)}
                    onClick={action.onClick}
                    className={getActionClassName(action.variant || 'ghost', action.className)}
                    title={action.label}
                  >
                    <ActionIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{action.label}</span>
                  </button>
                );
              })}

              {/* Primary Action */}
              {primaryAction && (
                <button
                  key="primary-full"
                  onClick={primaryAction.onClick}
                  className={getActionClassName(primaryAction.variant || 'primary', primaryAction.className)}
                  title={primaryAction.label}
                >
                  {primaryAction.icon && <primaryAction.icon className="w-4 h-4 flex-shrink-0" />}
                  <span>{primaryAction.label}</span>
                </button>
              )}
            </div>
          )}

          {/* 📱 MODO COMPACTO: Iconos secundarios + botón primario (800-1199px) */}
          {shouldShowCompact && (
            <div key="actions-compact" className="flex flex-wrap items-center gap-2">
              {/* Secondary Actions - Solo iconos */}
              {secondaryActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={getActionKey('compact', action, index)}
                    onClick={action.onClick}
                    className={`${getActionClassName(action.variant || 'ghost', action.className)} min-w-[42px] px-2.5`}
                    title={action.label}
                  >
                    <ActionIcon className="w-5 h-5 flex-shrink-0" />
                  </button>
                );
              })}

              {/* Primary Action - Completo */}
              {primaryAction && (
                <button
                  key="primary-compact"
                  onClick={primaryAction.onClick}
                  className={getActionClassName(primaryAction.variant || 'primary', primaryAction.className)}
                  title={primaryAction.label}
                >
                  {primaryAction.icon && <primaryAction.icon className="w-4 h-4 flex-shrink-0" />}
                  <span className="text-sm">{primaryAction.label}</span>
                </button>
              )}
            </div>
          )}

          {/* 🎯 MODO MINIMAL: Solo primario + menú "⋮" (< 800px) */}
          {shouldShowMinimal && (
            <div key="actions-minimal" className="flex items-center gap-2">
              {/* Primary Action - Siempre visible */}
              {primaryAction && (
                <button
                  key="primary-minimal"
                  onClick={primaryAction.onClick}
                  className={getActionClassName(primaryAction.variant || 'primary', primaryAction.className)}
                  title={primaryAction.label}
                >
                  {primaryAction.icon && <primaryAction.icon className="w-4 h-4 flex-shrink-0" />}
                  <span className="text-sm">{primaryAction.label}</span>
                </button>
              )}

              {/* Menú "Más opciones" - Solo si hay acciones secundarias */}
              {secondaryActions.length > 0 && (
                <div key="secondary-menu" className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={getActionClassName('ghost')}
                    title="Más opciones"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isMenuOpen && (
                        <div
                          key="dropdown-overlay"
                          className="fixed inset-0 z-40"
                          onClick={() => setIsMenuOpen(false)}
                        />
                    )}
                    {isMenuOpen && (
                        <motion.div
                          key="dropdown-menu"
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden z-50"
                        >
                          {/* Header del menú */}
                          <div className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] px-4 py-2.5">
                            <p className="text-xs font-bold text-white">Más Opciones</p>
                          </div>

                          {/* Lista de acciones secundarias */}
                          <div className="py-1">
                            {secondaryActions.map((action, index) => {
                              const ActionIcon = action.icon;
                              
                              return (
                                <button
                                  key={getActionKey('dropdown', action, index)}
                                  onClick={() => {
                                    action.onClick();
                                    setIsMenuOpen(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 text-gray-700"
                                >
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100">
                                    <ActionIcon className="w-4 h-4 text-gray-600" />
                                  </div>
                                  <span className="text-sm font-medium">{action.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
