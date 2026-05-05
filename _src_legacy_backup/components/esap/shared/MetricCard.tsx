/**
 * TARJETA DE MÉTRICA UNIFICADA
 * Componente compartido para métricas del dashboard ejecutivo
 * Usado en: Control Interno, Control Disciplinario, Gestión Legal
 */

import { motion } from 'motion/react';
import { ReactNode, ComponentType } from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon | ComponentType<any>;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    icon?: LucideIcon | ComponentType<any>;
  };
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend
}: MetricCardProps) {
  // Extract icon component safely
  const TrendIcon = trend?.icon;
  
  return (
    <motion.div
      className="p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2"
      style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
      whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm mb-1 sm:mb-2" style={{ color: '#6B7280' }}>
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-black mb-1 sm:mb-2 truncate" style={{ color: '#1F2937' }}>
            {value}
          </h3>
          {(subtitle || trend) && (
            <div className="flex items-center gap-2">
              {trend && (
                <p 
                  className="text-xs flex items-center gap-1" 
                  style={{ color: trend.isPositive ? '#10B981' : trend.isPositive === false ? '#EF4444' : '#6B7280' }}
                >
                  {TrendIcon && <TrendIcon className="w-3 h-3" />}
                  <span className="truncate">{trend.value}</span>
                </p>
              )}
              {subtitle && !trend && (
                <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0" style={{ background: iconBgColor }}>
          {Icon && <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: iconColor }} />}
        </div>
      </div>
    </motion.div>
  );
}