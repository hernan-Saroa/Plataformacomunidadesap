/**
 * COMPONENTE REUTILIZABLE: Badge de Sede
 * 
 * Muestra un badge con el nombre de la sede y opcionalmente un icono
 * 
 * Uso:
 * import { SedeBadge } from '../shared/SedeBadge';
 * 
 * <SedeBadge sede="Bogotá" showIcon />
 * <SedeBadge sede="Medellín" variant="outline" />
 */

import { Building2, MapPin } from 'lucide-react';
import { Badge } from '../ui/badge';

interface SedeBadgeProps {
  sede: string;
  variant?: 'default' | 'outline' | 'secondary';
  showIcon?: boolean;
  iconType?: 'building' | 'mappin';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SedeBadge({ 
  sede, 
  variant = 'default', 
  showIcon = true,
  iconType = 'building',
  size = 'md',
  className = '' 
}: SedeBadgeProps) {
  const Icon = iconType === 'building' ? Building2 : MapPin;
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const baseClassName = variant === 'default'
    ? 'bg-blue-100 text-blue-700 border-blue-300 border'
    : '';

  return (
    <Badge 
      variant={variant}
      className={`${baseClassName} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} mr-1`} />}
      {sede}
    </Badge>
  );
}

/**
 * COMPONENTE: Multi-Sede Badge
 * 
 * Muestra múltiples badges de sede o un contador si hay muchas
 * 
 * Uso:
 * <MultiSedeBadge sedes={['Bogotá', 'Medellín', 'Cali']} maxVisible={2} />
 */
interface MultiSedeBadgeProps {
  sedes: string[];
  maxVisible?: number;
  variant?: 'default' | 'outline';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function MultiSedeBadge({ 
  sedes, 
  maxVisible = 2,
  variant = 'default',
  showIcon = true,
  size = 'sm'
}: MultiSedeBadgeProps) {
  if (!sedes || sedes.length === 0) {
    return (
      <Badge variant="outline" className="text-xs text-gray-500">
        Sin sede asignada
      </Badge>
    );
  }

  const visibleSedes = sedes.slice(0, maxVisible);
  const remainingCount = sedes.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleSedes.map((sede, index) => (
        <SedeBadge 
          key={`${sede}-${index}`}
          sede={sede}
          variant={variant}
          showIcon={showIcon && index === 0} // Solo mostrar icono en el primero
          size={size}
        />
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

/**
 * COMPONENTE: Sede Info Card
 * 
 * Tarjeta completa con información de la sede
 * 
 * Uso:
 * <SedeInfoCard 
 *   nombreSede="Bogotá"
 *   codigoSede="DIR-BOG"
 *   nivel="Territorial"
 *   departamento="Cundinamarca"
 * />
 */
interface SedeInfoCardProps {
  nombreSede: string;
  codigoSede?: string;
  nivel?: string;
  departamento?: string;
  className?: string;
}

export function SedeInfoCard({
  nombreSede,
  codigoSede,
  nivel,
  departamento,
  className = ''
}: SedeInfoCardProps) {
  const nivelStyles = {
    'Nacional': 'bg-blue-100 text-blue-700 border-blue-300',
    'Territorial': 'bg-green-100 text-green-700 border-green-300',
    'Regional': 'bg-purple-100 text-purple-700 border-purple-300',
    'Sede': 'bg-orange-100 text-orange-700 border-orange-300'
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {nombreSede}
          </p>
          {nivel && (
            <Badge className={`${nivelStyles[nivel] || 'bg-gray-100 text-gray-700'} border text-xs`}>
              {nivel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {codigoSede && (
            <span className="font-mono">{codigoSede}</span>
          )}
          {codigoSede && departamento && (
            <span>•</span>
          )}
          {departamento && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {departamento}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}