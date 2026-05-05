/**
 * COMPONENTE - BADGES DE SEDES DE USUARIO
 * Muestra visualmente las sedes asignadas a un usuario
 * Para usar en tablas, tarjetas y vistas compactas
 */

import { Building2, Star, MapPin, ChevronDown } from 'lucide-react';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import type { AsignacionSede } from '../../types';

interface BadgesSedesUsuarioProps {
  asignaciones: AsignacionSede[];
  maxVisible?: number;
  showPrincipalOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function BadgesSedesUsuario({
  asignaciones,
  maxVisible = 2,
  showPrincipalOnly = false,
  size = 'sm',
  variant = 'default',
  className = '',
}: BadgesSedesUsuarioProps) {
  const [showAll, setShowAll] = useState(false);

  if (!asignaciones || asignaciones.length === 0) {
    return (
      <Badge variant="outline" className="text-gray-400">
        Sin sede asignada
      </Badge>
    );
  }

  // Ordenar: principal primero, luego por nombre
  const asignacionesOrdenadas = [...asignaciones].sort((a, b) => {
    if (a.esPrincipal && !b.esPrincipal) return -1;
    if (!a.esPrincipal && b.esPrincipal) return 1;
    return (a.unidad?.nombre || '').localeCompare(b.unidad?.nombre || '');
  });

  // Filtrar si solo se muestra la principal
  const asignacionesMostrar = showPrincipalOnly
    ? asignacionesOrdenadas.filter(a => a.esPrincipal)
    : asignacionesOrdenadas;

  const asignacionesVisibles = showAll 
    ? asignacionesMostrar 
    : asignacionesMostrar.slice(0, maxVisible);

  const asignacionesOcultas = asignacionesMostrar.length - asignacionesVisibles.length;

  const nivelColors = {
    nacional: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    territorial: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    regional: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    sede: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  if (variant === 'compact') {
    // Vista ultra compacta - solo cuenta
    const principal = asignacionesMostrar.find(a => a.esPrincipal);
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Building2 className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-sm text-gray-600">
          {principal?.unidad?.nombreCorto || principal?.unidad?.nombre || 'N/A'}
        </span>
        {asignacionesMostrar.length > 1 && (
          <Badge variant="secondary" className="text-xs">
            +{asignacionesMostrar.length - 1}
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    // Vista detallada con información completa
    return (
      <div className={`space-y-2 ${className}`}>
        {asignacionesVisibles.map((asignacion) => {
          if (!asignacion.unidad) return null;
          
          const color = nivelColors[asignacion.unidad.nivel] || nivelColors.regional;
          
          return (
            <motion.div
              key={asignacion.id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 p-2 rounded-lg border ${color.bg} ${color.border}`}
            >
              <Building2 className={`w-4 h-4 ${color.text}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${color.text} truncate`}>
                    {asignacion.unidad.nombre}
                  </span>
                  {asignacion.esPrincipal && (
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-current flex-shrink-0" />
                  )}
                </div>
                {asignacion.unidad.ciudad && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {asignacion.unidad.ciudad}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {asignacionesOcultas > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 text-xs text-[#003DA5] hover:text-[#002d7a] font-medium transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            {showAll ? 'Ver menos' : `Ver ${asignacionesOcultas} más`}
          </button>
        )}
      </div>
    );
  }

  // Vista por defecto - badges
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <AnimatePresence mode="popLayout">
        {asignacionesVisibles.map((asignacion) => {
          if (!asignacion.unidad) return null;
          
          const color = nivelColors[asignacion.unidad.nivel] || nivelColors.regional;
          
          return (
            <motion.div
              key={asignacion.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge
                className={`
                  ${color.bg} ${color.text} border-0 ${sizeClasses[size]}
                  flex items-center gap-1.5
                `}
              >
                {asignacion.esPrincipal && (
                  <Star className="w-3 h-3 fill-current" />
                )}
                <Building2 className="w-3 h-3" />
                <span className="truncate max-w-[150px]">
                  {asignacion.unidad.nombreCorto || asignacion.unidad.nombre}
                </span>
              </Badge>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {asignacionesOcultas > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className={`
            ${sizeClasses[size]}
            px-2 py-0.5 rounded-md 
            bg-gray-100 text-gray-600 
            hover:bg-gray-200 hover:text-gray-800
            transition-colors font-medium
            flex items-center gap-1
          `}
        >
          +{asignacionesOcultas}
        </button>
      )}
    </div>
  );
}

/**
 * VARIANTE - Badge de Sede Principal solamente
 */
interface BadgeSedePrincipalProps {
  asignaciones: AsignacionSede[];
  className?: string;
}

export function BadgeSedePrincipal({ asignaciones, className = '' }: BadgeSedePrincipalProps) {
  const principal = asignaciones.find(a => a.esPrincipal);

  if (!principal?.unidad) {
    return (
      <Badge variant="outline" className={`text-gray-400 ${className}`}>
        Sin sede principal
      </Badge>
    );
  }

  const nivelColors: Record<string, { bg: string; text: string }> = {
    nacional: { bg: 'bg-blue-100', text: 'text-blue-700' },
    territorial: { bg: 'bg-green-100', text: 'text-green-700' },
    regional: { bg: 'bg-purple-100', text: 'text-purple-700' },
    sede: { bg: 'bg-orange-100', text: 'text-orange-700' },
  };

  const color = nivelColors[principal.unidad.nivel] || nivelColors.regional;

  return (
    <Badge className={`${color.bg} ${color.text} border-0 gap-1.5 ${className}`}>
      <Star className="w-3 h-3 fill-current" />
      <Building2 className="w-3 h-3" />
      {principal.unidad.nombreCorto || principal.unidad.nombre}
    </Badge>
  );
}

/**
 * VARIANTE - Tooltip con información completa
 */
interface TooltipSedesUsuarioProps {
  asignaciones: AsignacionSede[];
  children: React.ReactNode;
}

export function TooltipSedesUsuario({ asignaciones, children }: TooltipSedesUsuarioProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!asignaciones || asignaciones.length === 0) {
    return <>{children}</>;
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl min-w-[200px] max-w-[300px]">
              <div className="font-semibold mb-2 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                Sedes Asignadas ({asignaciones.length})
              </div>
              <div className="space-y-1.5">
                {asignaciones.map((asignacion) => {
                  if (!asignacion.unidad) return null;
                  return (
                    <div key={asignacion.id} className="flex items-center gap-2">
                      {asignacion.esPrincipal && (
                        <Star className="w-3 h-3 text-yellow-400 fill-current flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">
                        {asignacion.unidad.nombre}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className="w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}