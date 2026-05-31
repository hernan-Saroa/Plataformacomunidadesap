import React from 'react';
import { ESAPLogoSVG } from './ESAPLogoSVG';

export interface ESAPLogoProps {
  variant?: 'color' | 'white' | 'dark' | 'icon';
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Componente unificado para el logotipo oficial de ESAP.
 * Delegado a la versión vectorial SVG de alta definición para evitar pixelación y logos corruptos/genéricos.
 */
export function ESAPLogo({ 
  variant = 'white', 
  className = '', 
  width,
  height 
}: ESAPLogoProps) {
  return (
    <ESAPLogoSVG
      variant={variant}
      className={className}
      width={width}
      height={height}
    />
  );
}

export default ESAPLogo;
