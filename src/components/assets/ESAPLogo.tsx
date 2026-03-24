/**
 * Logo ESAP - Logos Oficiales
 * Logos corporativos oficiales de ESAP
 * - Logo sobre blanco (azul)
 * - Logo sobre color (blanco)
 */

import React from 'react';

// Logos locales; reemplazamos el recurso faltante por la versión SVG existente
import logoColorOnWhite from '../../assets/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
import logoWhiteOnColor from  '../../assets/bf33c0f2d5f03ef0d7baf88a705a5a66362cd8c4.png';
import logoWhiteOnWhiteIcon from  '../../assets/4edbb7f080cc9b804243d1bbb6ad1f6cd9d2f3f7.png';
// import logoWhiteOnColor from '../../assets/esap-logo-white.svg';
// import logoColorOnWhite from 'figma:asset/1a688049d0ee8e121a6f2fff3a4cd08b5a2451ba.png';
// import logoWhiteOnColor from 'figma:asset/bf33c0f2d5f03ef0d7baf88a705a5a66362cd8c4.png';

interface ESAPLogoProps {
  variant?: 'color' | 'white' | 'dark' | 'icon';
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
  
  // Seleccionar logo según variante
  // 'color' y 'dark' usan el logo azul sobre blanco
  // 'white' usa el logo blanco sobre color
  const logoSrc = variant === 'icon' ? logoWhiteOnWhiteIcon : variant === 'color' ? logoWhiteOnColor : logoColorOnWhite;

  // const logoSrc = logoColorOnWhite;
  
  // Construir estilo inline si se especifican dimensiones
  const style: React.CSSProperties = {};
  if (width) style.width = `${width}px`;
  if (height) style.height = `${height}px`;

  return (
    <img
      src={logoSrc}
      alt="ESAP - Escuela Superior de Administración Pública"
      className={className}
      style={style}
    />
  );
}

// Export default para compatibilidad
export default ESAPLogo;
