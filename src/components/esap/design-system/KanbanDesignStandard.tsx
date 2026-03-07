/**
 * KanbanDesignStandard.tsx — Sistema de Diseño World-Class ESAP v1.0
 * 
 * Sistema de componentes reutilizables para tableros Kanban del backoffice ESAP
 * Basado en los principios de SAP Fiori adaptados al contexto colombiano
 * 
 * @author Sistema ESAP
 * @version 1.0
 * @date 27 de febrero de 2026
 * @module Control Interno Disciplinario / Defensa Judicial / Procesos Coactivos
 */

import React, { ReactNode } from 'react';
import { motion } from 'motion/react';

// ==================== DESIGN TOKENS ====================

export const ESAP_TOKENS = {
  colors: {
    // Corporativos
    primary: '#003DA5',
    primaryDark: '#002D7A',
    primaryLight: '#E0EDFF',
    background: '#f0f2f5',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    borderDefault: '#E2E8F0',
    borderLight: '#E5E7EB',
    borderSubtle: '#F3F4F6',

    // Texto
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      muted: '#D1D5DB',
    },

    // Semánticos
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#DC2626',
    info: '#2563EB',
    purple: '#7C3AED',
    orange: '#F97316',
  },

  spacing: {
    cardPadding: '14px',
    cardGap: '10px',
    columnPadding: '12px',
    columnGap: '16px',
    sectionGap: '12px',
    buttonGap: '8px',
    buttonGapSmall: '6px',
  },

  dimensions: {
    cardBorderRadius: 10,
    columnBorderRadius: 12,
    buttonBorderRadius: 8,
    badgeBorderRadius: 9999,
    accentBarHeight: 3,
    iconSize: {
      sm: 14,
      md: 16,
      lg: 20,
    },
    avatarSize: {
      sm: 24,
      md: 32,
      lg: 40,
    },
    buttonHeight: {
      tertiary: 30,
      tertiaryCompact: 26,
    },
    toolbar: {
      height: 36,
      viewToggle: 30,
    },
    columnWidth: {
      desktop: 320,
      tablet: 280,
      mobile: 'calc(100vw - 32px)',
      collapsed: 64,
    },
  },

  motion: {
    cardEntry: { opacity: 0, scale: 0.9 },
    cardAnimate: { opacity: 1, scale: 1 },
    expandCollapse: { duration: 0.3, ease: 'easeInOut' },
    fadeIn: { duration: 0.2 },
    searchExpand: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

// ==================== SISTEMA DE BOTONES ====================

interface KanbanButtonProps {
  children?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}

// L1 Primary — Acción principal (CTA)
export function KanbanButtonPrimary({ children, icon, onClick, disabled = false, title, className = '' }: KanbanButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2
        rounded-lg text-xs font-bold text-white transition-all
        hover:opacity-90 shadow-sm
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ backgroundColor: ESAP_TOKENS.colors.primary }}
    >
      {icon && <span className="w-3.5 h-3.5">{icon}</span>}
      {children}
    </button>
  );
}

// L2 Secondary — Acción secundaria visible
export function KanbanButtonSecondary({ children, icon, onClick, disabled = false, title, className = '' }: KanbanButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2
        rounded-lg text-xs font-semibold border border-gray-200
        bg-white text-gray-700 transition-all
        hover:border-[#003DA5]/30 hover:text-[#003DA5]
        hover:bg-[#003DA5]/[0.04] hover:shadow-sm
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon && <span className="w-3.5 h-3.5 opacity-60">{icon}</span>}
      {children}
    </button>
  );
}

// L3 Tertiary — Icon-only, acciones complementarias
interface KanbanButtonTertiaryProps extends KanbanButtonProps {
  compact?: boolean;
}

export function KanbanButtonTertiary({ icon, onClick, disabled = false, title, compact = false, className = '' }: KanbanButtonTertiaryProps) {
  const height = compact ? ESAP_TOKENS.dimensions.buttonHeight.tertiaryCompact : ESAP_TOKENS.dimensions.buttonHeight.tertiary;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex-1 flex items-center justify-center rounded-lg
        text-gray-500 bg-gray-50 border border-gray-200 transition-all
        hover:border-[#003DA5]/40 hover:text-[#003DA5] hover:bg-[#003DA5]/[0.05]
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ height }}
    >
      {icon && <span className="w-3.5 h-3.5">{icon}</span>}
    </button>
  );
}

// Destructive — Variante de L3 con hover rojo
export function KanbanButtonDestructive({ icon, onClick, disabled = false, title, compact = false, className = '' }: KanbanButtonTertiaryProps) {
  const height = compact ? ESAP_TOKENS.dimensions.buttonHeight.tertiaryCompact : ESAP_TOKENS.dimensions.buttonHeight.tertiary;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex-1 flex items-center justify-center rounded-lg
        text-gray-500 bg-gray-50 border border-gray-200 transition-all
        hover:border-red-300 hover:text-red-600 hover:bg-red-50
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ height }}
    >
      {icon && <span className="w-3.5 h-3.5">{icon}</span>}
    </button>
  );
}

// Semantic — Botón condicional full-width con borde semántico
interface KanbanButtonSemanticProps extends KanbanButtonProps {
  variant: 'success' | 'warning' | 'danger' | 'info';
}

export function KanbanButtonSemantic({ children, icon, onClick, disabled = false, variant, className = '' }: KanbanButtonSemanticProps) {
  const variants = {
    success: { border: '#10B981', text: '#065F46', bg: '#ECFDF5', hoverBg: '#D1FAE5' },
    warning: { border: '#F59E0B', text: '#92400E', bg: '#FFFBEB', hoverBg: '#FEF3C7' },
    danger: { border: '#DC2626', text: '#991B1B', bg: '#FEF2F2', hoverBg: '#FEE2E2' },
    info: { border: '#003DA5', text: '#003DA5', bg: '#E0EDFF', hoverBg: '#DBEAFE' },
  };

  const style = variants[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-2
        rounded-lg text-xs font-bold border-2 transition-all
        hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ borderColor: style.border, color: style.text, backgroundColor: style.bg }}
    >
      {icon && <span className="w-3.5 h-3.5">{icon}</span>}
      {children}
    </button>
  );
}

// ==================== LAYOUTS DE ACCIONES ====================

interface KanbanActionSectionProps {
  children: ReactNode;
}

export function KanbanActionSection({ children }: KanbanActionSectionProps) {
  return (
    <div className="flex flex-col gap-2 pt-3 mt-auto border-t border-gray-100">
      {children}
    </div>
  );
}

export function KanbanActionRowPrimary({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

export function KanbanActionRowTertiary({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1.5 w-full">{children}</div>;
}

// ==================== COMPONENTES DE TARJETA ====================

interface KanbanCardProps {
  accentColor?: string;
  isDragging?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function KanbanCard({ accentColor = ESAP_TOKENS.colors.primary, isDragging = false, onClick, children, className = '' }: KanbanCardProps) {
  return (
    <motion.div
      initial={ESAP_TOKENS.motion.cardEntry}
      animate={ESAP_TOKENS.motion.cardAnimate}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`bg-white border border-gray-200/80 hover:shadow-lg hover:border-gray-300 transition-all flex flex-col h-full overflow-hidden ${isDragging ? 'opacity-50 scale-95 border-gray-300' : ''
        } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ borderRadius: ESAP_TOKENS.dimensions.cardBorderRadius }}
      onClick={onClick}
    >
      {/* Accent Bar */}
      <KanbanAccentBar color={accentColor} />

      {/* Contenido */}
      <div className="flex-1 flex flex-col" style={{ padding: ESAP_TOKENS.spacing.cardPadding }}>
        {children}
      </div>
    </motion.div>
  );
}

interface KanbanAccentBarProps {
  color: string;
}

export function KanbanAccentBar({ color }: KanbanAccentBarProps) {
  return (
    <div
      style={{
        height: ESAP_TOKENS.dimensions.accentBarHeight,
        backgroundColor: color,
      }}
    />
  );
}

interface KanbanCardHeaderProps {
  icon: ReactNode;
  iconBg: string;
  title: string;
  titleColor?: string;
  subtitle?: string;
  rightContent?: ReactNode;
}

export function KanbanCardHeader({ icon, iconBg, title, titleColor = ESAP_TOKENS.colors.text.primary, subtitle, rightContent }: KanbanCardHeaderProps) {
  return (
    <div className="flex items-start gap-2 mb-2.5">
      {/* Icono */}
      <div
        className="flex-shrink-0 rounded-lg flex items-center justify-center"
        style={{
          width: ESAP_TOKENS.dimensions.avatarSize.md,
          height: ESAP_TOKENS.dimensions.avatarSize.md,
          backgroundColor: iconBg,
        }}
      >
        {icon}
      </div>

      {/* Título y subtítulo */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold truncate" style={{ color: titleColor }}>
          {title}
        </h4>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        )}
      </div>

      {/* Contenido derecho (badge, semáforo, etc.) */}
      {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
    </div>
  );
}

interface KanbanCardInfoSectionProps {
  children: ReactNode;
}

export function KanbanCardInfoSection({ children }: KanbanCardInfoSectionProps) {
  return (
    <div className="bg-slate-50/80 rounded-lg p-2.5 mb-2.5 space-y-1.5">
      {children}
    </div>
  );
}

interface KanbanCardInfoRowProps {
  label: string;
  value: string;
  truncate?: boolean;
}

export function KanbanCardInfoRow({ label, value, truncate = true }: KanbanCardInfoRowProps) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex-shrink-0">
        {label}
      </span>
      <span className={`text-xs text-gray-900 font-medium ${truncate ? 'truncate' : ''}`} title={value}>
        {value}
      </span>
    </div>
  );
}

interface KanbanCardProfesionalProps {
  nombre: string;
  initials?: string;
}

export function KanbanCardProfesional({ nombre, initials }: KanbanCardProfesionalProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const displayInitials = initials || getInitials(nombre);

  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div
        className="flex-shrink-0 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center"
        style={{
          width: ESAP_TOKENS.dimensions.avatarSize.sm,
          height: ESAP_TOKENS.dimensions.avatarSize.sm,
        }}
      >
        {displayInitials}
      </div>
      <span className="text-xs text-gray-700 font-semibold truncate">{nombre}</span>
    </div>
  );
}

interface KanbanCardBadgesProps {
  children: ReactNode;
}

export function KanbanCardBadges({ children }: KanbanCardBadgesProps) {
  return <div className="flex flex-wrap gap-1 mb-2.5">{children}</div>;
}

interface KanbanCardBadgeProps {
  label: string;
  color: string;
  bg: string;
  icon?: ReactNode;
}

export function KanbanCardBadge({ label, color, bg, icon }: KanbanCardBadgeProps) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ color, backgroundColor: bg }}
    >
      {icon && <span className="w-3 h-3">{icon}</span>}
      {label}
    </div>
  );
}

interface KanbanCardMetricsProps {
  items: Array<{
    icon: ReactNode;
    label: string;
    color?: string;
  }>;
}

export function KanbanCardMetrics({ items }: KanbanCardMetricsProps) {
  return (
    <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-gray-600">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-gray-300">|</span>}
          <div className="flex items-center gap-1" style={{ color: item.color }}>
            <span className="w-3.5 h-3.5">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== TOOLBAR ====================

interface KanbanToolbarProps {
  children: ReactNode;
  className?: string;
}

export function KanbanToolbar({ children, className = '' }: KanbanToolbarProps) {
  return (
    <div
      className={`bg-white border border-gray-200/80 rounded-xl px-5 py-3.5 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center gap-4 w-full">{children}</div>
    </div>
  );
}

interface KanbanViewToggleOption {
  value: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

interface KanbanViewToggleProps {
  current: string;
  options: KanbanViewToggleOption[];
  onChange: (value: string) => void;
}

export function KanbanViewToggle({ current, options, onChange }: KanbanViewToggleProps) {
  return (
    <div className="bg-slate-100 rounded-xl p-0.5 inline-flex gap-0.5">
      {options.map((option) => {
        const isActive = current === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative inline-flex items-center justify-center gap-1 px-2 rounded-lg transition-all ${isActive
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-500 hover:bg-gray-200/60'
              }`}
            style={{
              width: ESAP_TOKENS.dimensions.toolbar.viewToggle,
              height: ESAP_TOKENS.dimensions.toolbar.viewToggle,
              minWidth: ESAP_TOKENS.dimensions.toolbar.viewToggle,
              minHeight: ESAP_TOKENS.dimensions.toolbar.viewToggle,
            }}
          >
            <span className="w-4 h-4">{option.icon}</span>

            {option.badge !== undefined && option.badge > 0 && (
              <span
                className={`absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white text-[8px] font-bold px-1 ${isActive ? 'bg-blue-600' : 'bg-gray-400'
                  }`}
                style={{ minWidth: 14, height: 14 }}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface KanbanToolbarCTAProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
}

export function KanbanToolbarCTA({ children, icon, onClick, className = '' }: KanbanToolbarCTAProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-flex items-center gap-1.5 px-3.5 rounded-xl text-sm font-bold text-white flex-shrink-0 whitespace-nowrap transition-all ${className}`}
      style={{
        height: ESAP_TOKENS.dimensions.toolbar.height,
        backgroundColor: isHovered ? ESAP_TOKENS.colors.primaryDark : ESAP_TOKENS.colors.primary,
        boxShadow: '0 2px 4px rgba(0,61,165,0.25)',
      }}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
}