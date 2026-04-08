/**
 * ═════════════════════════════════════════════════════════════════════════
 * KPI CARD - DASHBOARD OCIG
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Tarjeta de KPI para el dashboard ejecutivo
 * Muestra métrica principal + tendencia + tooltip con detalle
 * 
 * @version 1.0
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';
import { ESAP_COLORS, ESAP_CLASSES } from '../utils/esapThemeOCIG';

// ═════════════════════════════════════════════════════════════════════════
// TIPOS
// ═════════════════════════════════════════════════════════════════════════

interface KPICardProps {
  titulo: string;
  valor: string | number;
  unidad?: string;
  tendencia?: {
    valor: number;        // Ej: +5 o -2
    tipo: 'positiva' | 'negativa' | 'neutral';
    descripcion?: string; // Ej: "vs mes anterior"
  };
  color?: 'verde' | 'amarillo' | 'rojo' | 'azul';
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

// ═════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE COLORES
// ═════════════════════════════════════════════════════════════════════════

const COLOR_CONFIG = {
  verde: {
    bg: 'bg-gradient-to-br from-[#D4EFDF] to-[#A9DFBF]',
    text: 'text-[#196F3D]',
    border: 'border-[#27AE60]',
    icon: '#27AE60',
  },
  amarillo: {
    bg: 'bg-gradient-to-br from-[#FEF9E7] to-[#FCF3CF]',
    text: 'text-[#875A12]',
    border: 'border-[#F39C12]',
    icon: '#F39C12',
  },
  rojo: {
    bg: 'bg-gradient-to-br from-[#FADBD8] to-[#F5B7B1]',
    text: 'text-[#922B21]',
    border: 'border-[#E74C3C]',
    icon: '#E74C3C',
  },
  azul: {
    bg: 'bg-gradient-to-br from-[#E8F4F8] to-[#AED6F1]',
    text: 'text-[#1B4F72]',
    border: 'border-[#2874A6]',
    icon: '#2874A6',
  },
};

// ═════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function KPICard({
  titulo,
  valor,
  unidad,
  tendencia,
  color = 'azul',
  tooltip,
  onClick,
  className = '',
}: KPICardProps) {
  
  const colorConfig = COLOR_CONFIG[color];

  const getTendenciaIcon = () => {
    if (!tendencia) return null;
    
    switch (tendencia.tipo) {
      case 'positiva':
        return <TrendingUp className="w-5 h-5" style={{ color: ESAP_COLORS.semaforo.verde }} />;
      case 'negativa':
        return <TrendingDown className="w-5 h-5" style={{ color: ESAP_COLORS.semaforo.rojo }} />;
      case 'neutral':
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTendenciaColor = () => {
    if (!tendencia) return '';
    
    switch (tendencia.tipo) {
      case 'positiva':
        return 'text-[#27AE60]';
      case 'negativa':
        return 'text-[#E74C3C]';
      case 'neutral':
        return 'text-gray-500';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-xl border-2 p-6
        shadow-sm hover:shadow-md transition-all
        ${onClick ? 'cursor-pointer' : ''}
        ${colorConfig.border}
        ${className}
      `}
      title={tooltip}
    >
      {/* Header con título y tooltip */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          {titulo}
        </h3>
        {tooltip && (
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={tooltip}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Separador decorativo */}
      <div className={`h-1 w-16 rounded-full mb-4 ${colorConfig.bg}`} />

      {/* Valor principal */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-5xl font-bold ${colorConfig.text}`}>
          {valor}
        </span>
        {unidad && (
          <span className="text-2xl font-medium text-gray-500">
            {unidad}
          </span>
        )}
      </div>

      {/* Tendencia */}
      {tendencia && (
        <div className="flex items-center gap-2">
          {getTendenciaIcon()}
          <span className={`text-sm font-semibold ${getTendenciaColor()}`}>
            {tendencia.valor > 0 ? '+' : ''}{tendencia.valor}
            {tendencia.descripcion && (
              <span className="text-gray-500 font-normal ml-1">
                {tendencia.descripcion}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Decoración de esquina */}
      <div 
        className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10 ${colorConfig.bg}`}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════

export default KPICard;
