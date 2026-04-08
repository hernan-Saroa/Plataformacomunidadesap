/**
 * BOTÓN DE ACCIÓN CONDICIONAL
 * Botón que se habilita/deshabilita según la etapa del proceso
 * Muestra tooltips explicativos cuando está deshabilitado
 */

import { Button } from '../../ui/button';
import { toast } from 'sonner';
import type { AccionDisponible } from './accionesPorEtapa';

interface BotonAccionCondicionalProps {
  accion: AccionDisponible;
  onClick: () => void;
  icono: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  fullWidth?: boolean;
  isMobile?: boolean;
}

export function BotonAccionCondicional({
  accion,
  onClick,
  icono,
  children,
  size = 'sm',
  variant = 'outline',
  className = '',
  fullWidth = false,
  isMobile = false
}: BotonAccionCondicionalProps) {
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!accion.habilitada) {
      toast.warning('Acción no disponible', {
        description: accion.razon || 'Esta acción no está disponible en la etapa actual',
        duration: 3000
      });
      return;
    }
    
    onClick();
  };

  // Clases base
  const baseClasses = fullWidth ? 'w-full' : '';
  
  // Clases de estado
  const estadoClasses = !accion.habilitada 
    ? 'opacity-50 cursor-not-allowed' 
    : accion.destacada 
    ? 'border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 font-bold' 
    : '';

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant={variant}
      disabled={!accion.habilitada}
      className={`${baseClasses} ${estadoClasses} ${className}`}
      title={!accion.habilitada ? `⚠️ ${accion.razon}` : accion.nombre}
    >
      {icono}
      {children}
    </Button>
  );
}
