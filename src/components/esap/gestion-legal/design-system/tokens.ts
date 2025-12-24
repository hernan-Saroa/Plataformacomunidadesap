/**
 * SIGL v5.0 - Design System Tokens
 * Documento base: DISE_O_UX_UI_SIGL_v5_MVP_CORREGIDO.md
 * 
 * ⚠️ ESTOS VALORES SON MANDATORIOS - NO MODIFICAR
 */

// ⭐ COLORES PRIMARIOS (CAMBIO MANDATORIO v5.0)
export const SIGL_COLORS = {
  // Primarios
  primary: '#0066CC',            // ⚠️ Azul ESAP v5.0 (antes era #003DA5)
  primaryDark: '#004C99',
  primaryLight: '#3399FF',
  primaryHover: '#0052A3',
  
  // ⭐ SEMÁFORO UNIVERSAL (Aplicar en TODOS los módulos)
  semaforoVerde: '#28A745',      // > 50% plazo disponible
  semaforoAmarillo: '#FFC107',   // 25-50% plazo
  semaforoRojo: '#DC3545',       // < 25% plazo
  semaforoCritico: '#8B0000',    // ≤ 0 días (con animate-pulse)
  
  // ⭐ COLORES POR MÓDULO MVP (Para badges/headers de tab)
  modDefensaJudicial: '#0066CC',      // MOD-01: Azul
  modJuzgamiento: '#9C27B0',          // MOD-02: Púrpura
  modAsesoria: '#FF9800',             // MOD-03: Naranja
  modBuzonNotif: '#2196F3',           // MOD-04: Azul claro
  modTerminos: '#607D8B',             // MOD-05: Gris azulado
  
  // ⭐ COLORES POR JURISDICCIÓN (MOD-01 específico)
  jurisdContencioso: '#1976D2',       // Contencioso Administrativo
  jurisdCivil: '#388E3C',             // Ordinaria Civil
  jurisdLaboral: '#F57C00',           // Laboral
  jurisdConstitucional: '#7B1FA2',    // Constitucional
  
  // Neutrales (Grises)
  gris100: '#F8F9FA',
  gris200: '#E9ECEF',
  gris300: '#DEE2E6',
  gris400: '#CED4DA',
  gris500: '#ADB5BD',
  gris600: '#6C757D',
  gris700: '#495057',
  gris800: '#343A40',
  gris900: '#212529',
  
  // Estados
  success: '#28A745',
  warning: '#FFC107',
  danger: '#DC3545',
  info: '#17A2B8',
  
  // Fondos
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8F9FA',
  bgDark: '#212529',
  bgHover: '#F1F3F5',
  bgSelected: '#E7F5FF',
  
  // Bordes
  border: '#DEE2E6',
  borderDark: '#ADB5BD',
  borderLight: '#E9ECEF',
  
  // Texto
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  textMuted: '#ADB5BD',
  textWhite: '#FFFFFF',
} as const;

// ⭐ ESPACIADO (Sistema de 4px base)
export const SIGL_SPACING = {
  xs: 4,      // 4px
  sm: 8,      // 8px
  md: 16,     // 16px
  lg: 24,     // 24px
  xl: 32,     // 32px
  xxl: 48,    // 48px
  xxxl: 64,   // 64px
} as const;

// ⭐ BORDES Y RADIOS
export const SIGL_BORDERS = {
  radiusCard: 8,
  radiusInput: 4,
  radiusModal: 12,
  radiusButton: 6,
  radiusBadge: 4,
  radiusTab: 6,
  
  // Tamaños de borde
  thin: '1px',
  medium: '2px',
  thick: '3px',
  
  // Estilos
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
} as const;

// ⭐ SOMBRAS
export const SIGL_SHADOWS = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,0.12)',
  md: '0 2px 8px rgba(0,0,0,0.15)',
  lg: '0 4px 16px rgba(0,0,0,0.15)',
  xl: '0 8px 24px rgba(0,0,0,0.20)',
  hover: '0 4px 12px rgba(0,102,204,0.20)', // Sombra con color primario
} as const;

// ⭐ TIPOGRAFÍA (Fuente: Inter de Google Fonts)
export const SIGL_TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.25,
  },
  h2: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  body: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  small: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  micro: {
    fontSize: 10,
    fontWeight: 400,
    lineHeight: 1.5,
  },
} as const;

// ⭐ ALTURAS DE COMPONENTES
export const SIGL_HEIGHTS = {
  inputSm: 32,
  inputMd: 40,
  inputLg: 48,
  buttonSm: 32,
  buttonMd: 40,
  buttonLg: 48,
  navTab: 48,
  tableRow: 56,
  cardHeader: 64,
} as const;

// ⭐ Z-INDEX (Capas de profundidad)
export const SIGL_Z_INDEX = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
} as const;

// ⭐ TRANSICIONES
export const SIGL_TRANSITIONS = {
  fast: '150ms ease-in-out',
  normal: '250ms ease-in-out',
  slow: '350ms ease-in-out',
  
  // Propiedades específicas
  all: 'all 250ms ease-in-out',
  color: 'color 150ms ease-in-out',
  background: 'background-color 150ms ease-in-out',
  transform: 'transform 250ms ease-in-out',
  opacity: 'opacity 200ms ease-in-out',
} as const;

// ⭐ BREAKPOINTS (Responsive)
export const SIGL_BREAKPOINTS = {
  xs: 0,      // Mobile small
  sm: 576,    // Mobile
  md: 768,    // Tablet
  lg: 992,    // Desktop
  xl: 1200,   // Desktop large
  xxl: 1400,  // Desktop extra large
} as const;

// ⭐ ANCHOS MÁXIMOS
export const SIGL_MAX_WIDTH = {
  container: 1440,
  modal: 800,
  modalLarge: 1200,
  sidebar: 280,
  card: 400,
} as const;

/**
 * Utilidad para generar sombra de semáforo
 */
export function getSemaforoShadow(color: string): string {
  return `0 0 8px ${color}40`; // 40 es 25% de opacidad en hex
}

/**
 * Utilidad para determinar color de texto según fondo
 */
export function getTextColor(bgColor: string): string {
  // Simplificado: colores oscuros usan texto blanco
  const darkColors = [
    SIGL_COLORS.primary,
    SIGL_COLORS.primaryDark,
    SIGL_COLORS.semaforoCritico,
    SIGL_COLORS.jurisdConstitucional,
    SIGL_COLORS.modJuzgamiento,
  ];
  
  return darkColors.includes(bgColor) 
    ? SIGL_COLORS.textWhite 
    : SIGL_COLORS.textPrimary;
}

/**
 * Exportar tokens combinados para uso fácil
 */
export const SIGL_TOKENS = {
  colors: SIGL_COLORS,
  spacing: SIGL_SPACING,
  borders: SIGL_BORDERS,
  shadows: SIGL_SHADOWS,
  typography: SIGL_TYPOGRAPHY,
  heights: SIGL_HEIGHTS,
  zIndex: SIGL_Z_INDEX,
  transitions: SIGL_TRANSITIONS,
  breakpoints: SIGL_BREAKPOINTS,
  maxWidth: SIGL_MAX_WIDTH,
} as const;

export default SIGL_TOKENS;
