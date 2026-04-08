/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPONENTE: SEMÁFORO DE SEGUIMIENTO DEL PLAN ANUAL DE AUDITORÍA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema de visualización cromática progresiva del avance de actividades
 * Escala: 0% (Rojo) → 50% (Amarillo) → 100% (Verde)
 * 
 * Diseño: Corporativo ESAP con gradientes y optimización 4K
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client';

import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface SemaforoSeguimientoPAIProps {
  porcentaje: number; // 0-100
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showIcon?: boolean;
  variant?: 'circular' | 'bar' | 'badge' | 'card';
  className?: string;
}

export function SemaforoSeguimientoPAI({
  porcentaje,
  size = 'md',
  showLabel = true,
  showIcon = true,
  variant = 'badge',
  className = ''
}: SemaforoSeguimientoPAIProps) {
  
  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULO DE COLOR PROGRESIVO
  // ═══════════════════════════════════════════════════════════════════════
  const getColorProgresivo = (value: number) => {
    // Asegurar que el valor esté en el rango 0-100
    const normalizado = Math.max(0, Math.min(100, value));
    
    if (normalizado === 0) {
      return {
        bg: 'bg-gray-200',
        gradient: 'from-gray-300 to-gray-400',
        text: 'text-gray-700',
        border: 'border-gray-400',
        hex: '#9CA3AF',
        label: 'Sin Iniciar',
        icon: Clock
      };
    } else if (normalizado < 25) {
      return {
        bg: 'bg-red-100',
        gradient: 'from-red-500 to-red-600',
        text: 'text-red-700',
        border: 'border-red-500',
        hex: '#EF4444',
        label: 'Crítico',
        icon: AlertCircle
      };
    } else if (normalizado < 50) {
      return {
        bg: 'bg-orange-100',
        gradient: 'from-orange-500 to-orange-600',
        text: 'text-orange-700',
        border: 'border-orange-500',
        hex: '#F97316',
        label: 'Bajo Avance',
        icon: AlertCircle
      };
    } else if (normalizado < 75) {
      return {
        bg: 'bg-yellow-100',
        gradient: 'from-yellow-500 to-yellow-600',
        text: 'text-yellow-700',
        border: 'border-yellow-500',
        hex: '#EAB308',
        label: 'En Progreso',
        icon: TrendingUp
      };
    } else if (normalizado < 100) {
      return {
        bg: 'bg-lime-100',
        gradient: 'from-lime-500 to-lime-600',
        text: 'text-lime-700',
        border: 'border-lime-500',
        hex: '#84CC16',
        label: 'Avanzado',
        icon: TrendingUp
      };
    } else {
      return {
        bg: 'bg-green-100',
        gradient: 'from-green-500 to-green-600',
        text: 'text-green-700',
        border: 'border-green-500',
        hex: '#10B981',
        label: 'Completado',
        icon: CheckCircle2
      };
    }
  };

  const color = getColorProgresivo(porcentaje);
  const Icon = color.icon;

  // ═══════════════════════════════════════════════════════════════════════
  // TAMAÑOS
  // ═══════════════════════════════════════════════════════════════════════
  const sizeClasses = {
    sm: {
      badge: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
      circular: 'w-12 h-12 text-sm',
      bar: 'h-2',
      card: 'p-3'
    },
    md: {
      badge: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm',
      circular: 'w-16 h-16 text-base',
      bar: 'h-3',
      card: 'p-4'
    },
    lg: {
      badge: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      text: 'text-base',
      circular: 'w-24 h-24 text-xl',
      bar: 'h-4',
      card: 'p-5'
    },
    xl: {
      badge: 'px-6 py-3 text-lg',
      icon: 'w-6 h-6',
      text: 'text-lg',
      circular: 'w-32 h-32 text-2xl',
      bar: 'h-6',
      card: 'p-6'
    }
  };

  const sizes = sizeClasses[size];

  // ═══════════════════════════════════════════════════════════════════════
  // VARIANTES DE VISUALIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════

  // BADGE: Etiqueta compacta con ícono
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center space-x-2 rounded-lg font-semibold border-2 ${color.bg} ${color.text} ${color.border} ${sizes.badge} ${className}`}>
        {showIcon && <Icon className={sizes.icon} />}
        <span>{porcentaje}%</span>
        {showLabel && <span className="opacity-80">• {color.label}</span>}
      </div>
    );
  }

  // BAR: Barra de progreso horizontal
  if (variant === 'bar') {
    return (
      <div className={`w-full ${className}`}>
        {showLabel && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {showIcon && <Icon className={sizes.icon} style={{ color: color.hex }} />}
              <span className={`font-semibold ${color.text} ${sizes.text}`}>{color.label}</span>
            </div>
            <span className={`font-bold ${sizes.text}`} style={{ color: color.hex }}>
              {porcentaje}%
            </span>
          </div>
        )}
        <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizes.bar}`}>
          <div 
            className={`${sizes.bar} bg-gradient-to-r ${color.gradient} transition-all duration-500 ease-out`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    );
  }

  // CIRCULAR: Indicador circular con porcentaje
  if (variant === 'circular') {
    return (
      <div className={`relative ${className}`}>
        <svg className={sizes.circular} viewBox="0 0 100 100">
          {/* Círculo de fondo */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          {/* Círculo de progreso */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color.hex}
            strokeWidth="8"
            strokeDasharray={`${(porcentaje / 100) * 283} 283`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Texto central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showIcon && <Icon className={sizes.icon} style={{ color: color.hex }} />}
          <span className={`font-bold ${sizes.text}`} style={{ color: color.hex }}>
            {porcentaje}%
          </span>
        </div>
      </div>
    );
  }

  // CARD: Tarjeta completa con información detallada
  if (variant === 'card') {
    return (
      <div className={`rounded-xl border-2 ${color.border} ${color.bg} ${sizes.card} ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {showIcon && (
              <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center`}>
                <Icon className="w-6 h-6" style={{ color: color.hex }} />
              </div>
            )}
            <div>
              <p className={`text-sm font-medium ${color.text} opacity-80`}>Avance</p>
              <p className={`text-2xl font-bold ${color.text}`}>{porcentaje}%</p>
            </div>
          </div>
          {showLabel && (
            <div className={`px-3 py-1 rounded-lg bg-white border-2 ${color.border}`}>
              <span className={`text-sm font-semibold ${color.text}`}>{color.label}</span>
            </div>
          )}
        </div>
        {/* Barra de progreso */}
        <div className="w-full h-3 bg-white bg-opacity-50 rounded-full overflow-hidden">
          <div 
            className={`h-3 bg-gradient-to-r ${color.gradient} transition-all duration-500 ease-out`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE: TABLA DE SEMÁFORO PARA MÚLTIPLES ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════

interface ActividadConSemaforo {
  id: number | string;
  nombre: string;
  porcentaje: number;
  requiereAutorizacion?: boolean;
  autorizada?: boolean;
}

interface TablaSemaforoProps {
  actividades: ActividadConSemaforo[];
  className?: string;
}

export function TablaSemaforoPAI({ actividades, className = '' }: TablaSemaforoProps) {
  const promedioAvance = actividades.length > 0
    ? Math.round(actividades.reduce((sum, act) => sum + act.porcentaje, 0) / actividades.length)
    : 0;

  return (
    <div className={`bg-white rounded-xl border-2 border-gray-200 overflow-hidden ${className}`}>
      {/* Header con promedio */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">Seguimiento de Actividades</h3>
            <p className="text-sm text-white text-opacity-80">{actividades.length} actividades en total</p>
          </div>
          <SemaforoSeguimientoPAI 
            porcentaje={promedioAvance} 
            variant="circular" 
            size="lg"
            showIcon={false}
          />
        </div>
      </div>

      {/* Tabla de actividades */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">#</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Actividad</th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Avance</th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Estado</th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Autorización</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {actividades.map((actividad, index) => (
              <tr key={actividad.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600 font-medium">{index + 1}</td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-800">{actividad.nombre}</p>
                </td>
                <td className="px-6 py-4">
                  <SemaforoSeguimientoPAI 
                    porcentaje={actividad.porcentaje} 
                    variant="bar" 
                    size="sm"
                    showLabel={false}
                    showIcon={false}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <SemaforoSeguimientoPAI 
                    porcentaje={actividad.porcentaje} 
                    variant="badge" 
                    size="sm"
                    showLabel={true}
                    showIcon={true}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  {actividad.requiereAutorizacion ? (
                    actividad.autorizada ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold border border-green-300">
                        ✓ Autorizada
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold border border-orange-300">
                        🔒 Pendiente
                      </span>
                    )
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer con resumen */}
      <div className="bg-gray-50 border-t-2 border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Avance Promedio del Plan</span>
          <SemaforoSeguimientoPAI 
            porcentaje={promedioAvance} 
            variant="badge" 
            size="md"
            showLabel={true}
            showIcon={true}
          />
        </div>
      </div>
    </div>
  );
}
