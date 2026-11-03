/**
 * El shell tiene `* { transition: opacity, box-shadow, transform 150ms }` fuera de
 * las capas de Tailwind, así que ninguna clase `transition-*` lo anula. En los
 * elementos que anima Motion esa transición se reinicia en cada cuadro y la
 * animación se arrastra; el estilo en línea sí le gana.
 */
export const SIN_TRANSICION_CSS = { transition: 'none' } as const;

/** Para elementos animados con Motion que además cambian de color al pasar el mouse. */
export const SOLO_TRANSICION_DE_COLOR = {
  transition: 'color 150ms, background-color 150ms, border-color 150ms, box-shadow 150ms',
} as const;
