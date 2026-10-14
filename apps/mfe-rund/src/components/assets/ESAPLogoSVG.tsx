/**
 * Logo ESAP - Versión SVG Vectorial Oficial y Premium
 * SVG inline vectorial del logo oficial de la ESAP
 * - Reemplaza logotipos genéricos (E8) por la pirámide de círculos oficial con las letras E-S-A-P.
 * - Escalable sin pérdida de calidad y optimizado para pantallas 4K.
 * - Incluye corte de letras mediante máscara para transparencia nativa sobre fondos dinámicos.
 */

import React, { useId } from 'react';

export interface ESAPLogoSVGProps {
  variant?: 'color' | 'white' | 'dark' | 'icon' | 'icon-color';
  className?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

/**
 * Creates a ref callback that forces width/height with !important on an SVG element.
 * This is NOT a hook — it's a plain function, so it can be called anywhere
 * without violating React's rules of hooks.
 */
function createForceSizeRef(style?: React.CSSProperties, width?: number, height?: number) {
  const finalW = style?.width ?? (width ? `${width}px` : undefined);
  const finalH = style?.height ?? (height ? `${height}px` : undefined);

  return (el: SVGSVGElement | null) => {
    if (!el) return;
    if (finalW) el.style.setProperty('width', String(finalW), 'important');
    if (finalH) el.style.setProperty('height', String(finalH), 'important');
  };
}

/**
 * Isotipo ESAP (solo la pirámide de círculos con letras E-S-A-P)
 * Versión compacta para barra lateral colapsada
 */
export function IsotipoESAP({
  variant = 'color',
  width,
  height,
  className = '',
  style
}: ESAPLogoSVGProps) {
  const maskId = useId().replace(/:/g, '_');
  const isColor = variant === 'color' || variant === 'dark' || variant === 'icon-color';
  const color = isColor ? '#003DA5' : '#FFFFFF';
  const svgRef = createForceSizeRef(style, width, height);

  const styleWithDimensions = {
    aspectRatio: '70/80',
    display: 'block',
    flexShrink: 0,
    ...(width ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...style
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 70 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`esap-logo size-auto ${className}`}
      style={styleWithDimensions}
      aria-label="ESAP Isotipo"
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="70" height="80" fill="white" />
          <text
            x="11"
            y="63"
            fontFamily="Georgia, 'Times New Roman', Times, serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="black"
            textAnchor="middle"
          >
            e
          </text>
          <text
            x="27"
            y="63"
            fontFamily="Georgia, 'Times New Roman', Times, serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="black"
            textAnchor="middle"
          >
            s
          </text>
          <text
            x="43"
            y="63"
            fontFamily="Georgia, 'Times New Roman', Times, serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="black"
            textAnchor="middle"
          >
            a
          </text>
          <text
            x="59"
            y="63"
            fontFamily="Georgia, 'Times New Roman', Times, serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="black"
            textAnchor="middle"
          >
            p
          </text>
        </mask>
      </defs>

      {/* Isotipo: Pirámide de círculos oficial */}
      {/* Fila 1 */}
      <circle cx="35" cy="19" r="6" fill={color} />

      {/* Fila 2 */}
      <circle cx="27" cy="33" r="6" fill={color} />
      <circle cx="43" cy="33" r="6" fill={color} />

      {/* Fila 3 */}
      <circle cx="19" cy="47" r="6" fill={color} />
      <circle cx="35" cy="47" r="6" fill={color} />
      <circle cx="51" cy="47" r="6" fill={color} />

      {/* Fila 4 con máscara para calado de letras */}
      <g mask={`url(#${maskId})`}>
        <circle cx="11" cy="61" r="6" fill={color} />
        <circle cx="27" cy="61" r="6" fill={color} />
        <circle cx="43" cy="61" r="6" fill={color} />
        <circle cx="59" cy="61" r="6" fill={color} />
      </g>
    </svg>
  );
}

/**
 * Componente principal del logotipo oficial de ESAP en formato SVG vectorial
 */
export function ESAPLogoSVG({
  variant = 'white',
  className = '',
  width,
  height,
  style
}: ESAPLogoSVGProps) {
  const maskId = useId().replace(/:/g, '_');
  const isColor = variant === 'color' || variant === 'dark' || variant === 'icon-color';
  const color = isColor ? '#003DA5' : '#FFFFFF';

  // Si es variante icono, devolvemos el isotipo limpio
  if (variant === 'icon' || variant === 'icon-color') {
    return <IsotipoESAP variant={variant} width={width} height={height} className={className} style={style} />;
  }

  const svgRef = createForceSizeRef(style, width, height);

  const styleWithDimensions = {
    aspectRatio: '270/80',
    display: 'block',
    flexShrink: 0,
    ...(width ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
    ...style
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 270 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`esap-logo size-auto ${className}`}
      style={styleWithDimensions}
      aria-label="ESAP - Escuela Superior de Administración Pública"
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="270" height="80" fill="white" />
          <text
            x="11"
            y="63"
            fontFamily="Georgia, 'Times New Roman', Times, serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="black"
            textAnchor="middle"
          >
            e
          </text>
          <text
            x="27"
            y="63"
            fontFamily="Georgia, 'Times New Roman', Times, serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="black"
            textAnchor="middle"
          >
            s
          </text>
          <text
            x="43"
            y="63"
            fontFamily="Georgia, 'Times New Roman', Times, serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="black"
            textAnchor="middle"
          >
            a
          </text>
          <text
            x="59"
            y="63"
            fontFamily="Georgia, 'Times New Roman', Times, serif"
            fontWeight="bold"
            fontSize="9.5"
            fill="black"
            textAnchor="middle"
          >
            p
          </text>
        </mask>
      </defs>

      {/* Isotipo: Pirámide de círculos oficial */}
      {/* Fila 1 */}
      <circle cx="35" cy="19" r="6" fill={color} />

      {/* Fila 2 */}
      <circle cx="27" cy="33" r="6" fill={color} />
      <circle cx="43" cy="33" r="6" fill={color} />

      {/* Fila 3 */}
      <circle cx="19" cy="47" r="6" fill={color} />
      <circle cx="35" cy="47" r="6" fill={color} />
      <circle cx="51" cy="47" r="6" fill={color} />

      {/* Fila 4 con máscara para calado de letras */}
      <g mask={`url(#${maskId})`}>
        <circle cx="11" cy="61" r="6" fill={color} />
        <circle cx="27" cy="61" r="6" fill={color} />
        <circle cx="43" cy="61" r="6" fill={color} />
        <circle cx="59" cy="61" r="6" fill={color} />
      </g>

      {/* Separador vertical */}
      <line x1="72" y1="16" x2="72" y2="64" stroke={color} strokeWidth="1.5" />

      {/* Texto institucional */}
      <text
        x="80"
        y="36"
        fontFamily="Georgia, 'Times New Roman', Times, serif"
        fontWeight="bold"
        fontSize="15.5"
        fill={color}
        textAnchor="start"
      >
        Escuela Superior de
      </text>
      <text
        x="80"
        y="58"
        fontFamily="Georgia, 'Times New Roman', Times, serif"
        fontWeight="bold"
        fontSize="15.5"
        fill={color}
        textAnchor="start"
      >
        Administración Pública
      </text>
    </svg>
  );
}

export default ESAPLogoSVG;
