/**
 * Logo ESAP - Logos Oficiales
 * Logos corporativos oficiales de ESAP
 * - Logo sobre blanco (azul)
 * - Logo sobre color (blanco)
 */

import React from 'react';

// Importar logos oficiales usando el esquema figma:asset
import logoColorOnWhite from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
import logoWhiteOnColor from 'figma:asset/bf33c0f2d5f03ef0d7baf88a705a5a66362cd8c4.png';

interface ESAPLogoProps {
  variant?: 'color' | 'white' | 'dark';
  className?: string;
  width?: number;
  height?: number;
}

export function ESAPLogo({ 
  variant = 'white', 
  className = '', 
  width,
  height 
}: ESAPLogoProps) {
  
  const logoSrc = variant === 'white' ? logoWhiteOnColor : logoColorOnWhite;
  
  return (
    <img 
      src={logoSrc} 
      alt="ESAP - Escuela Superior de Administración Pública"
      className={className}
      width={width}
      height={height}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Export default para compatibilidad
export default ESAPLogo;