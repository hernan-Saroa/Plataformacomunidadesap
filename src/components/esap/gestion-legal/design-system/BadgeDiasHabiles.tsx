/**
 * BadgeDiasHabiles - Componente para indicar que los plazos son en días hábiles
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Tooltip informativo sobre días hábiles
 */

import { Calendar, Info } from 'lucide-react';
import { Badge } from '../../../ui/badge';
import { ModuleInfoTooltip } from './ModuleInfoTooltip';

interface BadgeDiasHabilesProps {
  dias: number;
  mostrarIcono?: boolean;
  mostrarTooltip?: boolean;
  variant?: 'default' | 'inline' | 'compact';
}

export function BadgeDiasHabiles({ 
  dias, 
  mostrarIcono = true,
  mostrarTooltip = true,
  variant = 'default' 
}: BadgeDiasHabilesProps) {
  
  const getColorClasses = () => {
    if (dias <= 0) return 'bg-red-100 text-red-800 border-red-300';
    if (dias <= 5) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (dias <= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getTexto = () => {
    const diasAbsoluto = Math.abs(dias);
    const label = diasAbsoluto === 1 ? 'día hábil' : 'días hábiles';
    
    if (dias === 0) return 'Vence hoy';
    if (dias < 0) return `Vencido hace ${diasAbsoluto} ${label}`;
    
    if (variant === 'compact') return `${dias} dh`;
    return `${dias} ${label}`;
  };

  const tooltipContent = (
    <div className="text-xs space-y-2">
      <div className="font-semibold text-[#003DA5] mb-2">
        📅 Días Hábiles
      </div>
      <div className="space-y-1">
        <p>Los <strong>días hábiles</strong> excluyen:</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li>Sábados y Domingos</li>
          <li>Festivos nacionales de Colombia</li>
        </ul>
      </div>
      <div className="pt-2 border-t border-gray-300 text-gray-600">
        Todos los plazos legales en SIGL se calculan automáticamente en días hábiles según la normativa colombiana.
      </div>
    </div>
  );

  const BadgeContent = (
    <Badge 
      className={`
        ${getColorClasses()} 
        border font-medium
        ${variant === 'inline' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}
        ${variant === 'compact' ? 'text-[10px] px-1 py-0.5' : ''}
        flex items-center gap-1
      `}
    >
      {mostrarIcono && <Calendar className="w-3 h-3" />}
      {getTexto()}
    </Badge>
  );

  if (mostrarTooltip) {
    return (
      <div className="flex items-center gap-1">
        {BadgeContent}
        <ModuleInfoTooltip 
          content={tooltipContent}
          side="top"
        >
          <button className="text-gray-400 hover:text-[#003DA5] transition-colors">
            <Info className="w-3.5 h-3.5" />
          </button>
        </ModuleInfoTooltip>
      </div>
    );
  }

  return BadgeContent;
}

/**
 * IndicadorDiasHabiles - Banner informativo para secciones
 * ✅ DESHABILITADO - No se muestra en la aplicación
 */
export function IndicadorDiasHabiles({ className = '' }: { className?: string }) {
  return null; // Componente deshabilitado - no se muestra
}

/**
 * BannerDiasHabiles - Banner compacto para headers de módulos
 * ✅ DESHABILITADO - No se muestra en la aplicación
 */
export function BannerDiasHabiles({ className = '' }: { className?: string }) {
  return null; // Componente deshabilitado - no se muestra
}