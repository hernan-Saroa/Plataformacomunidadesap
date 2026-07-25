/**
 * Clases compartidas para el modo "pantalla dividida" (split-screen) usado al crear un
 * proceso desde el Centro de Comunicaciones → Clasificación IA.
 *
 * - El formulario de creación se ancla en la mitad SUPERIOR (SPLIT_TOP_*).
 * - El detalle de la comunicación se ancla en la mitad INFERIOR (SPLIT_BOTTOM_*).
 *
 * Se conserva el centrado horizontal propio de cada modal (left-1/2 + translate-x-1/2);
 * solo se sobreescribe la posición vertical y la altura. El util `cn` usa tailwind-merge,
 * por lo que las clases con `!` (important) colocadas al final ganan sobre las del modal.
 */

// Formulario de creación: mitad superior de la pantalla.
export const SPLIT_TOP_CONTENT_CLASS =
  '!top-2 !bottom-auto !translate-y-0 !h-[54vh] !max-h-[54vh]';

// Overlay del formulario superior: transparente y sin capturar clics, para que el detalle
// de la comunicación (mitad inferior) permanezca visible detrás.
export const SPLIT_TOP_OVERLAY_CLASS =
  '!bg-transparent !backdrop-blur-none pointer-events-none';

// Detalle de la comunicación: mitad inferior de la pantalla.
export const SPLIT_BOTTOM_CONTENT_CLASS =
  '!top-auto !bottom-2 !translate-y-0 !h-[42vh] !max-h-[42vh]';
